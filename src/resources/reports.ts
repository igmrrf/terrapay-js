import type { BaseClient } from '../core/client.js';
import type { LedgerBalanceResponse, RequestOptions, StatementsResponse } from '../types/index.js';

/**
 * Handles reporting operations such as ledger balances and statements.
 */
export class Reports {
  constructor(private readonly client: BaseClient) {}

  /**
   * Retrieves the current balance for all partner ledgers.
   *
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the ledger balance report.
   */
  async getLedgerBalance(options?: RequestOptions): Promise<LedgerBalanceResponse> {
    return this.client.request<LedgerBalanceResponse>(
      'GET',
      '/gsma/accounts/all/balance_v1',
      undefined,
      options,
    );
  }

  /**
   * Retrieves the current balance for a specific currency ledger.
   *
   * @param currency - ISO currency code (e.g., 'USD').
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the ledger balance report for the currency.
   */
  async getLedgerBalanceByCurrency(
    currency: string,
    options?: RequestOptions,
  ): Promise<LedgerBalanceResponse> {
    const path = `/gsma/accounts/${encodeURIComponent(currency)}/balance_v1`;
    return this.client.request<LedgerBalanceResponse>('GET', path, undefined, options);
  }

  /**
   * Retrieves partner statements for a specific time period.
   *
   * @param start - Start date in ISO 8601 UTC DateTime format (e.g., '2020-04-29T13:00:00Z').
   * @param end - End date in ISO 8601 UTC DateTime format.
   * @param ledgerBookName - The name of the ledger book to retrieve statements from.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the statements report.
   */
  async getStatements(
    start: string,
    end: string,
    ledgerBookName?: string,
    options?: RequestOptions,
  ): Promise<StatementsResponse> {
    // The Statements API is hosted on the partner-portal (engage) host, NOT the
    // core `/eig` API host, and has no `/eig` prefix. `client.statementsBaseUrl`
    // resolves to the correct per-environment host (or a config override).
    const params = [`start=${encodeURIComponent(start)}`, `end=${encodeURIComponent(end)}`];
    if (ledgerBookName) params.push(`ledgerBookName=${encodeURIComponent(ledgerBookName)}`);
    const base = this.client.statementsBaseUrl.replace(/\/$/, '');
    // BaseClient.request treats a path starting with `http` as an absolute URL.
    const url = `${base}/PartnerPortalReports/partnerstatements_v1?${params.join('&')}`;
    return this.client.request<StatementsResponse>('GET', url, undefined, options);
  }
}
