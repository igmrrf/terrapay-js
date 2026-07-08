import { describe, expect, it, mock } from 'bun:test';
import { AuthenticationError } from './core/errors.js';
import { TerraPay } from './index.js';

describe('TerraPay SDK Integration (Mocked)', () => {
  const config = {
    username: 'test',
    password: 'hash',
    originCountry: 'US',
    environment: 'uat' as const,
  };

  it('should successfully get account status', async () => {
    const sdk = new TerraPay(config);

    // Mock global fetch
    // @ts-expect-error Mocking global fetch for testing
    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'available' }), { status: 200 })),
    );

    const status = await sdk.accounts.getStatus('msisdn', '+123', { bnv: 'Test Name' });
    expect(status.status).toBe('available');

    // Verify fetch was called with correct method
    expect(global.fetch).toHaveBeenCalled();
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/msisdn/%2B123/status');
    expect(init.method).toBe('GET');
  });

  it('should throw AuthenticationError on 401', async () => {
    const sdk = new TerraPay(config);

    // @ts-expect-error Mocking global fetch for testing
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ error: { errorDescription: 'Auth Failed' } }), {
          status: 401,
        }),
      ),
    );

    expect(sdk.accounts.getStatus('msisdn', '+123', { bnv: 'Test Name' })).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('should trip circuit breaker after consecutive failures', async () => {
    // We override maxRetries to 0 so we easily trigger failures without long backoffs
    const sdk = new TerraPay({
      ...config,
      maxRetries: 0,
    });

    // Make fetch always return 500
    // @ts-expect-error Mocking global fetch for testing
    global.fetch = mock(() => Promise.resolve(new Response(null, { status: 500 })));

    // Fail 3 times (the default threshold we will implement)
    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow();
    await expect(sdk.accounts.getStatus('msisdn', '2', { bnv: 'Test Name' })).rejects.toThrow();
    await expect(sdk.accounts.getStatus('msisdn', '3', { bnv: 'Test Name' })).rejects.toThrow();

    const fetchCallsBefore = (global.fetch as any).mock.calls.length;

    // 4th time should throw CircuitBreaker error without hitting fetch
    await expect(sdk.accounts.getStatus('msisdn', '4', { bnv: 'Test Name' })).rejects.toThrow(
      'Circuit breaker is open',
    );

    const fetchCallsAfter = (global.fetch as any).mock.calls.length;
    expect(fetchCallsAfter).toBe(fetchCallsBefore);
  });

  it('should correctly configure production environment', () => {
    const prodSdk = new TerraPay({
      ...config,
      environment: 'production',
    });
    // @ts-expect-error reading private for test
    expect(prodSdk.client.baseUrl).toBe('https://connect.terrapay.com/eig');
  });

  it('should throw ValidationError on 400', async () => {
    const sdk = new TerraPay(config);

    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(null, { status: 400 })));

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow(
      'Validation failed',
    );
  });

  it('should throw RateLimitError on 429', async () => {
    const sdk = new TerraPay({ ...config, maxRetries: 0 });

    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(null, { status: 429 })));

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow(
      'Rate limit exceeded',
    );
  });

  it('should return empty object on 204 No Content', async () => {
    const sdk = new TerraPay(config);

    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(null, { status: 204 })));

    const res = await sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' });
    expect(res).toEqual({} as any);
  });

  it('should throw AuthenticationError on a 200 body with an auth error envelope', async () => {
    const sdk = new TerraPay(config);
    const body = {
      error: {
        errorCategory: 'authorisation',
        errorCode: '1003',
        errorDescription: 'Authentication failed. Username or Password is incorrect.',
      },
    };
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow(
      AuthenticationError,
    );
  });

  it('should throw TerraPayError on a 200 body with a businessRule error envelope', async () => {
    const sdk = new TerraPay(config);
    const body = {
      error: {
        errorCategory: 'businessRule',
        errorCode: '6008',
        errorDescription: 'Beneficiary name does not match',
      },
    };
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow(
      'Beneficiary name does not match',
    );
  });

  it('should NOT throw when a 200 body has no error envelope', async () => {
    const sdk = new TerraPay(config);
    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'available' }), { status: 200 })),
    );

    const res = await sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' });
    expect(res.status).toBe('available');
  });

  it('should throw Timeout Error on AbortError', async () => {
    const sdk = new TerraPay({ ...config, maxRetries: 0, timeout: 50 });

    // @ts-expect-error
    global.fetch = mock(() => {
      return new Promise((_, reject) => {
        setTimeout(() => {
          const error = new Error('Timeout');
          error.name = 'AbortError';
          reject(error);
        }, 100); // 100ms > 50ms timeout
      });
    });

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow(
      'Request timed out after 50ms',
    );
  });

  it('should retry on 500 errors', async () => {
    const sdk = new TerraPay({ ...config, maxRetries: 1 });

    let calls = 0;
    // @ts-expect-error
    global.fetch = mock(() => {
      calls++;
      if (calls === 1) {
        return Promise.resolve(new Response(null, { status: 500 }));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    });

    const result = await sdk.transactions.getStatus('ref123');
    expect(calls).toBe(2);
    expect((result as any).success).toBe(true);
  });

  it('should retry on network errors (e.g., fetch throws TypeError)', async () => {
    const sdk = new TerraPay({ ...config, maxRetries: 1 });

    let calls = 0;
    // @ts-expect-error
    global.fetch = mock(() => {
      calls++;
      if (calls === 1) {
        return Promise.reject(new TypeError('fetch failed'));
      }
      return Promise.resolve(new Response(JSON.stringify({ success: true }), { status: 200 }));
    });

    const result = await sdk.transactions.getStatus('ref123');
    expect(calls).toBe(2);
    expect((result as any).success).toBe(true);
  });

  it('should recover circuit breaker after resetTimeout (half-open to closed)', async () => {
    const sdk = new TerraPay({
      ...config,
      maxRetries: 0,
      circuitBreaker: { failureThreshold: 2, resetTimeout: 50 },
    });

    // Make fetch always return 500
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(null, { status: 500 })));

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow();
    await expect(sdk.accounts.getStatus('msisdn', '2', { bnv: 'Test Name' })).rejects.toThrow(); // Tripped
    await expect(sdk.accounts.getStatus('msisdn', '3', { bnv: 'Test Name' })).rejects.toThrow(
      'Circuit breaker is open',
    );

    // Wait for resetTimeout to expire
    await new Promise((resolve) => setTimeout(resolve, 60));

    // @ts-expect-error Mock successful response for half-open retry
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));

    // Should succeed and close circuit
    const res = await sdk.accounts.getStatus('msisdn', '4', { bnv: 'Test Name' });
    expect(res).toEqual({} as any);
  });

  it('should handle non-JSON error payloads gracefully', async () => {
    const sdk = new TerraPay({ ...config, maxRetries: 0 });

    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(new Response('<html>Bad Gateway</html>', { status: 502 })),
    );

    await expect(sdk.accounts.getStatus('msisdn', '1', { bnv: 'Test Name' })).rejects.toThrow(
      'API request failed with status 502',
    );
  });

  it('should merge custom headers correctly', async () => {
    const sdk = new TerraPay(config);

    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));

    await sdk.accounts.getStatus(
      'msisdn',
      '1',
      { bnv: 'Test Name' },
      { headers: { 'X-Custom': 'Test' } },
    );

    const [, init] = (global.fetch as any).mock.calls[0];
    expect(init.headers['X-Custom']).toBe('Test');
    expect(init.headers['X-USERNAME']).toBe('test'); // default still there
  });

  it('should exhaust retries and throw TerraPayError', async () => {
    const sdk = new TerraPay({ ...config, maxRetries: 1 });

    let calls = 0;
    // @ts-expect-error
    global.fetch = mock(() => {
      calls++;
      return Promise.reject(new TypeError('fetch failed'));
    });

    await expect(sdk.transactions.getStatus('ref123')).rejects.toThrow('fetch failed');
    expect(calls).toBe(2); // Initial attempt (0) + 1 retry = 2 calls
  });
});
