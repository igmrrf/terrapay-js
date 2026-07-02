import type { BaseClient } from '../core/client.js';
import type { QuotationRequest, QuotationResponse, RequestOptions } from '../types/index.js';

/**
 * Handles price discovery and foreign exchange rate quotations.
 */
export class Quotations {
  constructor(private readonly client: BaseClient) {}

  /**
   * Requests a foreign exchange rate for a specific transaction (V1 API).
   *
   * @param data - The quotation request details.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the quotation response.
   */
  async create(data: QuotationRequest, options?: RequestOptions): Promise<QuotationResponse> {
    return this.client.request<QuotationResponse>('POST', '/gsma/quotations', data, options);
  }

  /**
   * Requests a foreign exchange rate using the V2 API, supporting scheme-specific rates (e.g., VISA, Mastercard).
   *
   * @param data - The quotation request details.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the quotation response.
   */
  async createV2(data: QuotationRequest, options?: RequestOptions): Promise<QuotationResponse> {
    return this.client.request<QuotationResponse>('POST', '/gsmaV2/quotations', data, options);
  }

  /**
   * Retrieves corridor quotations (bulk rates) for a specific prefunding currency.
   *
   * @param prefundingCurrency - The currency to prefund (e.g., 'USD')
   * @param instrumentType - The sink type ('WALLET', 'BANK_AC', 'CARD')
   * @param transactionType - The transaction type ('p2p', 'b2b', etc.)
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to a list of corridor rates.
   */
  async getCorridorRates(
    prefundingCurrency: string,
    instrumentType: string,
    transactionType = 'p2p',
    options?: RequestOptions,
  ): Promise<QuotationResponse[]> {
    const path = `/gsmaV2/quotations/${encodeURIComponent(prefundingCurrency)}?instrumentType=${encodeURIComponent(instrumentType)}&transactionType=${encodeURIComponent(transactionType)}`;
    return this.client.request<QuotationResponse[]>('GET', path, undefined, options);
  }

  /**
   * Retrieves corridor quotations (bulk rates) using the V3 API for a specific
   * prefunding currency.
   *
   * @param prefundingCurrency - The currency to prefund (e.g., 'USD')
   * @param instrumentType - The sink type ('WALLET', 'BANK_AC', 'CARD')
   * @param transactionType - The transaction type ('p2p', 'b2b', etc.)
   */
  async getCorridorRatesV3(
    prefundingCurrency: string,
    instrumentType: string,
    transactionType = 'p2p',
    options?: RequestOptions,
  ): Promise<QuotationResponse[]> {
    const path = `/gsmaV3/quotations/${encodeURIComponent(prefundingCurrency)}?instrumentType=${encodeURIComponent(instrumentType)}&transactionType=${encodeURIComponent(transactionType)}`;
    return this.client.request<QuotationResponse[]>('GET', path, undefined, options);
  }
}
