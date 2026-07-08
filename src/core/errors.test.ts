import { describe, expect, it } from 'bun:test';
import { AuthenticationError, RateLimitError, TerraPayError, ValidationError } from './errors.js';
import { RESPONSE_CODES, getResponseMessage } from './response-codes.js';

describe('Error Handling', () => {
  it('should normalize API error response', () => {
    const rawError = {
      error: {
        errorCategory: 'businessRule',
        errorCode: '2001',
        errorDescription: 'Source amount is invalid',
        errorDateTime: '2023-10-27 11:00:00',
      },
    };

    const error = new TerraPayError('Original Message', 400, rawError);

    expect(error.message).toBe('Source amount is invalid');
    expect(error.errorCategory).toBe('businessRule');
    expect(error.errorCode).toBe('2001');
    expect(error.status).toBe(400);
  });

  it('should handle specialized error classes', () => {
    const rateLimit = new RateLimitError('Too many requests');
    expect(rateLimit.status).toBe(429);
    expect(rateLimit.name).toBe('RateLimitError');

    const authError = new AuthenticationError('Invalid key');
    expect(authError.status).toBe(401);

    const validationError = new ValidationError();
    expect(validationError.status).toBe(400);
    expect(validationError.name).toBe('ValidationError');
  });

  it('should fall back to the known RC message when no description is provided', () => {
    const rawError = {
      error: {
        errorCategory: 'validation',
        errorCode: 'RC117',
        errorDateTime: '2023-10-27 11:00:00',
      },
    };
    const error = new TerraPayError('Original Message', 400, rawError);
    expect(error.errorCode).toBe('RC117');
    expect(error.message).toBe("The beneficiary's name does not match the records.");
  });

  it('should keep original message for an unknown error code', () => {
    const rawError = { error: { errorCode: 'RC999' } };
    const error = new TerraPayError('Original Message', 400, rawError);
    expect(error.message).toBe('Original Message');
  });

  it('should prefer errorDescription over the RC lookup', () => {
    const rawError = { error: { errorCode: 'RC117', errorDescription: 'Custom API text' } };
    const error = new TerraPayError('Original Message', 400, rawError);
    expect(error.message).toBe('Custom API text');
  });

  it('should handle malformed error payloads gracefully', () => {
    const err1 = new TerraPayError('Base msg', 400, 'Just a string');
    expect(err1.message).toBe('Base msg');
    expect(err1.errorCode).toBeUndefined();

    const err2 = new TerraPayError('Base msg', 400, null);
    expect(err2.message).toBe('Base msg');
    expect(err2.errorCode).toBeUndefined();

    const err3 = new TerraPayError('Base msg', 400, { some: 'other field' });
    expect(err3.message).toBe('Base msg');
    expect(err3.errorCode).toBeUndefined();
  });

  it('RESPONSE_CODES: exposes the full RC100–RC161 table', () => {
    expect(Object.keys(RESPONSE_CODES)).toHaveLength(62);
    expect(RESPONSE_CODES.RC100).toContain('mandatory parameter is missing');
    expect(RESPONSE_CODES.RC161).toBe('Network read timed out. Please retry the request.');
    expect(getResponseMessage('RC109')).toContain('Authentication failed');
    expect(getResponseMessage('RC999')).toBeUndefined();
  });
});
