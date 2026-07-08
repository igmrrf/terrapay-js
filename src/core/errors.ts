import { getResponseMessage } from './response-codes.js';

export class TerraPayError extends Error {
  public readonly status?: number;
  public readonly errorCategory?: string;
  public readonly errorCode?: string;
  public readonly errorDateTime?: string;
  public readonly rawError?: unknown;

  constructor(message: string, status?: number, rawError?: unknown) {
    super(message);
    this.name = 'TerraPayError';
    this.status = status;
    this.rawError = rawError;

    if (rawError && typeof rawError === 'object' && 'error' in rawError) {
      const errObj = (rawError as Record<string, any>).error;
      this.errorCategory = errObj.errorCategory;
      this.errorCode = errObj.errorCode;
      this.errorDateTime = errObj.errorDateTime;
      // Overwrite message if API provided a specific description, otherwise
      // fall back to the known message for the response code (RC100–RC161).
      if (errObj.errorDescription) {
        this.message = errObj.errorDescription;
      } else if (this.errorCode) {
        const known = getResponseMessage(this.errorCode);
        if (known) {
          this.message = known;
        }
      }
    }
  }
}

export class RateLimitError extends TerraPayError {
  constructor(message = 'Rate limit exceeded', status = 429, rawError?: unknown) {
    super(message, status, rawError);
    this.name = 'RateLimitError';
  }
}

export class AuthenticationError extends TerraPayError {
  constructor(message = 'Authentication failed', status = 401, rawError?: unknown) {
    super(message, status, rawError);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends TerraPayError {
  constructor(message = 'Validation failed', status = 400, rawError?: unknown) {
    super(message, status, rawError);
    this.name = 'ValidationError';
  }
}
