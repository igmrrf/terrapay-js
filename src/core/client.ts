import type { RequestOptions, TerraPayConfig } from '../types/index.js';
import { getAuthHeaders } from './auth.js';
import { AuthenticationError, RateLimitError, TerraPayError, ValidationError } from './errors.js';

/**
 * Internal HTTP client for interacting with the TerraPay API.
 * Handles authentication, retries, jitter, and circuit breaking.
 */
export class BaseClient {
  private readonly baseUrl: string;
  private failures = 0;
  private lastFailureTime = 0;
  private readonly failureThreshold: number;
  private readonly resetTimeout: number;

  /**
   * Initializes the client with configuration and determines the base URL.
   *
   * @param config - The SDK configuration.
   */
  constructor(public readonly config: TerraPayConfig) {
    if (config.baseUrl) {
      this.baseUrl = config.baseUrl;
    } else {
      this.baseUrl =
        config.environment === 'production'
          ? 'https://connect.terrapay.com/eig'
          : 'https://uat-connect.terrapay.com:21211/eig';
    }

    this.failureThreshold = config.circuitBreaker?.failureThreshold ?? 3;
    this.resetTimeout = config.circuitBreaker?.resetTimeout ?? 30000;
  }

  /**
   * Executes an HTTP request to the TerraPay API with resilience.
   *
   * @template T - The expected response type.
   * @param method - HTTP method (GET, POST, etc.).
   * @param path - API endpoint path (relative to baseUrl).
   * @param body - Optional request payload.
   * @param options - Per-request options like headers or correlation IDs.
   * @returns A promise resolving to the API response.
   * @throws {TerraPayError} On API failures, timeouts, or circuit breaker trips.
   */
  async request<T>(
    method: string,
    path: string,
    body?: unknown,
    options: RequestOptions = {},
  ): Promise<T> {
    if (this.failures >= this.failureThreshold) {
      if (Date.now() - this.lastFailureTime < this.resetTimeout) {
        throw new TerraPayError('Circuit breaker is open', 503);
      }
      // Half-open state: allow this request to proceed, but if it fails, it will immediately trip again.
    }

    const url = `${this.baseUrl}${path}`;
    const maxRetries = this.config.maxRetries ?? 2;
    let attempt = 0;

    while (attempt <= maxRetries) {
      const authHeaders = await getAuthHeaders(this.config);
      const headers = {
        ...authHeaders,
        ...options.headers,
      };

      if (options.correlationId) {
        headers['X-Correlation-ID'] = options.correlationId;
      }

      // Multipart bodies: let fetch set the Content-Type (with boundary) itself,
      // and send the FormData as-is rather than JSON-encoding it.
      const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
      if (isFormData) {
        delete headers['Content-Type'];
      }

      const requestBody = body ? (isFormData ? (body as FormData) : JSON.stringify(body)) : undefined;

      const controller = new AbortController();
      const timeoutMs = options.timeout ?? this.config.timeout ?? 30000;
      const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

      try {
        const response = await fetch(url, {
          method,
          headers,
          body: requestBody,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          await this.handleError(response, attempt, maxRetries);
        }

        // 204 No Content handling
        if (response.status === 204 || response.headers.get('content-length') === '0') {
          this.onSuccess();
          return {} as T;
        }

        this.onSuccess();
        return (await response.json()) as T;
      } catch (error: unknown) {
        clearTimeout(timeoutId);

        // Record failure for circuit breaker only on actual network/5xx errors
        if (this.shouldRetry(error)) {
          this.onFailure();
        }

        // Handle AbortError specifically
        if (error instanceof Error && error.name === 'AbortError') {
          throw new TerraPayError(`Request timed out after ${timeoutMs}ms`, 408);
        }

        // If it's a network error or 5xx that got re-thrown, decide if we retry
        if (this.shouldRetry(error) && attempt < maxRetries) {
          attempt++;
          await this.sleepWithJitter(attempt);
          continue;
        }

        throw error;
      }
    }

    throw new TerraPayError('Max retries exceeded');
  }

  private onSuccess() {
    this.failures = 0;
  }

  private onFailure() {
    this.failures++;
    this.lastFailureTime = Date.now();
  }

  private async handleError(
    response: Response,
    attempt: number,
    maxRetries: number,
  ): Promise<void> {
    let errorData: unknown = {};
    try {
      errorData = await response.json();
    } catch {
      // Ignore if body is not JSON
    }

    const status = response.status;
    const isRetryable = status === 429 || status >= 500;

    if (isRetryable && attempt < maxRetries) {
      // Do not throw here, just return to let the catch block handle retry logic via the thrown error
      throw new TerraPayError('Retryable error', status, errorData);
    }

    if (status === 401 || status === 403) {
      throw new AuthenticationError('Authentication failed', status, errorData);
    }

    if (status === 400 || status === 422) {
      throw new ValidationError('Validation failed', status, errorData);
    }

    if (status === 429) {
      throw new RateLimitError('Rate limit exceeded', status, errorData);
    }

    throw new TerraPayError(`API request failed with status ${status}`, status, errorData);
  }

  private shouldRetry(error: unknown): boolean {
    // Retry on network errors or specifically thrown retryable TerraPayErrors
    if (error instanceof TerraPayError) {
      return error.status === 429 || (error.status ? error.status >= 500 : false);
    }
    // Type error / network errors (like fetch failed)
    return true;
  }

  private async sleepWithJitter(attempt: number): Promise<void> {
    const baseDelay = 500 * 2 ** (attempt - 1); // 500ms, 1000ms, 2000ms...
    const jitter = Math.random() * 200; // up to 200ms of jitter
    const delay = Math.min(baseDelay + jitter, 10000); // cap at 10s
    return new Promise((resolve) => setTimeout(resolve, delay));
  }
}
