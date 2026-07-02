import type { BaseClient } from '../core/client.js';
import { encryptPAN } from '../core/encryption.js';
import type {
  AccountStatusResponse,
  IdentifierType,
  RequestOptions,
  TerraPayVerifyRequest,
  TerraPayVerifyResponse,
} from '../types/index.js';

/**
 * Handles account-related operations such as checking account status and verification.
 */
export class Accounts {
  constructor(private readonly client: BaseClient) {}

  /**
   * Verifies the operational status of a beneficiary account and matches the name.
   *
   * @param identifierType - The type of the identifier (e.g., 'msisdn', 'accountNumber')
   * @param identifier - The actual identifier value
   * @param bnv - Optional beneficiary name for fuzzy matching
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the account status and name matching results.
   */
  async getStatus(
    identifierType: IdentifierType,
    identifier: string,
    bnv?: string,
    options?: RequestOptions,
  ): Promise<AccountStatusResponse> {
    const path = `/gsma/accounts/${encodeURIComponent(identifierType)}/${encodeURIComponent(identifier)}/status`;
    const finalPath = bnv ? `${path}?bnv=${encodeURIComponent(bnv)}` : path;

    return this.client.request<AccountStatusResponse>('GET', finalPath, undefined, options);
  }

  /**
   * Checks the status of a card (PAN) beneficiary and matches the name.
   * The PAN is RSA-encrypted client-side and sent in the `X-PAN` header.
   *
   * @param pan - The plaintext card number (PAN)
   * @param bnv - Beneficiary name for fuzzy matching
   * @param country - ISO Alpha-2 country code of the beneficiary
   * @param options - Optional request configuration (timeout, correlationId)
   */
  async getPanStatus(
    pan: string,
    bnv: string,
    country: string,
    options?: RequestOptions,
  ): Promise<AccountStatusResponse> {
    if (!this.client.config.publicKey) {
      throw new Error('`publicKey` is required in the SDK config to encrypt PAN details.');
    }

    const encryptedPan = await encryptPAN(pan, this.client.config.publicKey);
    const path = `/gsma/pan/status?bnv=${encodeURIComponent(bnv)}&country=${encodeURIComponent(country)}`;

    return this.client.request<AccountStatusResponse>('GET', path, undefined, {
      ...options,
      headers: {
        ...options?.headers,
        'X-PAN': encryptedPan,
      },
    });
  }

  /**
   * TerraPay Verify (TPV) - Ensures the authenticity of payment transactions before initiation.
   * Note: This usually points to a different API host in UAT (tpverify.terrapay.com).
   * If using a different host, ensure the `client` is configured with the TPV base URL,
   * or override it via headers if your network topology requires it.
   */
  async verify(
    data: TerraPayVerifyRequest,
    options?: RequestOptions,
  ): Promise<TerraPayVerifyResponse> {
    // Note: The BaseClient handles the environment URL, but TPV uses a different subdomain.
    // In a full production setup, the BaseClient could take an API selector, or you can
    // pass a custom TPV client. Assuming standard routing for now.
    return this.client.request<TerraPayVerifyResponse>(
      'POST',
      '/tpverify/api/v1/verify',
      data,
      options,
    );
  }
}
