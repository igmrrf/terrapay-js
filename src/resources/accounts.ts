import type { BaseClient } from '../core/client.js';
import { encryptPAN } from '../core/encryption.js';
import type {
  AccountStatusParams,
  AccountStatusResponse,
  IdentifierType,
  PanStatusParams,
  RequestOptions,
  TerraPayVerifyRequest,
  TerraPayVerifyResponse,
} from '../types/index.js';

/** Query-param keys for account status, in the order the API documents them. */
const ACCOUNT_STATUS_KEYS: readonly string[] = [
  'bnv',
  'bankcode',
  'bankname',
  'country',
  'msisdn',
  'provider',
  'snv',
  'banksubcode',
  'accounttype',
  'beneficiaryidtype',
  'idnumber',
];

/**
 * Builds a `?a=1&b=2` query string from the given params, including only the
 * listed keys that have a non-empty value, in the order given. Each value is
 * URL-encoded (spaces → `%20`). Returns '' when nothing is set.
 */
function buildQuery(params: object, keys: readonly string[]): string {
  const record = params as Record<string, unknown>;
  const parts: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (value !== undefined && value !== null && value !== '') {
      parts.push(`${key}=${encodeURIComponent(String(value))}`);
    }
  }
  return parts.length > 0 ? `?${parts.join('&')}` : '';
}

/**
 * Handles account-related operations such as checking account status and verification.
 */
export class Accounts {
  constructor(private readonly client: BaseClient) {}

  /**
   * Verifies the operational status of a beneficiary account (mobile wallet or
   * bank) and matches the name.
   *
   * @param identifierType - The type of the identifier (e.g., 'msisdn', 'accountNumber')
   * @param identifier - The actual identifier value (MSISDN or bank account number/IBAN)
   * @param params - Query parameters. For wallets typically `{ bnv }` (+ optional
   *   `snv`, `provider`); for bank accounts `{ bnv, bankname, country }` plus the
   *   conditional `bankcode`, `banksubcode`, `msisdn`, `accounttype`, etc.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the account status and name matching results.
   */
  async getStatus(
    identifierType: IdentifierType,
    identifier: string,
    params: AccountStatusParams,
    options?: RequestOptions,
  ): Promise<AccountStatusResponse> {
    const path = `/gsma/accounts/${encodeURIComponent(identifierType)}/${encodeURIComponent(identifier)}/status`;
    const finalPath = `${path}${buildQuery(params, ACCOUNT_STATUS_KEYS)}`;

    return this.client.request<AccountStatusResponse>('GET', finalPath, undefined, options);
  }

  /**
   * Checks the status of a card (PAN) beneficiary and matches the name.
   * The PAN is RSA-encrypted client-side and sent in the `X-PAN` header.
   *
   * @param pan - The plaintext card number (PAN)
   * @param params - Query parameters: `bnv` and `country` (mandatory), `msisdn` (conditional)
   * @param options - Optional request configuration (timeout, correlationId)
   */
  async getPanStatus(
    pan: string,
    params: PanStatusParams,
    options?: RequestOptions,
  ): Promise<AccountStatusResponse> {
    if (!this.client.config.publicKey) {
      throw new Error('`publicKey` is required in the SDK config to encrypt PAN details.');
    }

    const encryptedPan = await encryptPAN(pan, this.client.config.publicKey);
    const query = buildQuery(params, ['bnv', 'country', 'msisdn']);
    const path = `/gsma/accounts/pan/status${query}`;

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
   * TPV lives on a different host/port than the core API; the request is sent to
   * the client's configured `tpVerifyBaseUrl`.
   */
  async verify(
    data: TerraPayVerifyRequest,
    options?: RequestOptions,
  ): Promise<TerraPayVerifyResponse> {
    const url = `${this.client.tpVerifyBaseUrl}/tpverify/api/v1/verify`;
    return this.client.request<TerraPayVerifyResponse>('POST', url, data, options);
  }
}
