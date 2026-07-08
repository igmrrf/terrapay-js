import type { TerraPayConfig } from '../types/index.js';

/**
 * Returns the UTC timestamp formatted as YYYY-MM-DD HH:mm:ss
 */
export function getUtcTimestamp(): string {
  const date = new Date();
  return date.toISOString().replace(/T/, ' ').replace(/\..+/, '');
}

async function sha256(message: string): Promise<string> {
  const msgBuffer = new TextEncoder().encode(message);
  const hashBuffer = await globalThis.crypto.subtle.digest('SHA-256', msgBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Generates the required authentication headers for the TerraPay API.
 */
export async function getAuthHeaders(
  config: TerraPayConfig,
  isFormData: boolean,
): Promise<Record<string, string>> {
  const isHashed = config.isPasswordHashed ?? true;

  const finalPassword = isHashed ? config.password : await sha256(config.password);

  return {
    'X-USERNAME': config.username,
    'X-PASSWORD': finalPassword,
    'X-DATE': getUtcTimestamp(),
    'X-ORIGINCOUNTRY': config.originCountry,
    'User-Agent': 'terrapay-js/1.0.1',
    ...(!isFormData && { 'Content-Type': 'application/json' }),
  };
}
