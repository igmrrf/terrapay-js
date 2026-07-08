import { describe, expect, it } from 'bun:test';
import type { TerraPayConfig } from '../types/index.js';
import { getAuthHeaders, getUtcTimestamp } from './auth.js';

describe('Auth Utilities', () => {
  const config: TerraPayConfig = {
    username: 'testuser',
    password: 'password123',
    originCountry: 'US',
    environment: 'uat',
    isPasswordHashed: false,
  };

  it('should generate a UTC timestamp in correct format', () => {
    const ts = getUtcTimestamp();
    // Format: YYYY-MM-DD HH:mm:ss
    expect(ts).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
  });

  it('should generate authentication headers', async () => {
    const headersPromise = getAuthHeaders(config, false);
    expect(headersPromise).toBeInstanceOf(Promise);
    const headers = await headersPromise;
    expect(headers['X-USERNAME']).toBe('testuser');
    expect(headers['X-ORIGINCOUNTRY']).toBe('US');
    expect(headers['X-DATE']).toMatch(/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/);
    // SHA256 of 'password123'
    expect(headers['X-PASSWORD']).toBe(
      'ef92b778bafe771e89245b89ecbc08a44a4e166c06659911881f383d4473e94f',
    );
  });

  it('should use pre-hashed password if isPasswordHashed is true', async () => {
    const preHashedConfig = { ...config, isPasswordHashed: true, password: 'ALREADY_HASHED' };
    const headers = await getAuthHeaders(preHashedConfig, false);
    expect(headers['X-PASSWORD']).toBe('ALREADY_HASHED');
  });
});
