import type { BaseClient } from '../core/client.js';
import { classifyRemitStatus } from '../status.js';
import type {
  CancelTransactionRequest,
  CancelTransactionResponse,
  RequestOptions,
  ReverseTransactionRequest,
  ReverseTransactionResponse,
  TransactionRequest,
  TransactionResponse,
} from '../types/index.js';

/**
 * Handles all transaction-related operations including creation, status tracking, and reversals.
 */
export class Transactions {
  constructor(private readonly client: BaseClient) {}

  /**
   * Initiates a payout transaction (Remit).
   *
   * @param data - The transaction details including sender and receiver info.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the created transaction response.
   */
  async create(data: TransactionRequest, options?: RequestOptions): Promise<TransactionResponse> {
    const response = await this.client.request<TransactionResponse>(
      'POST',
      '/gsma/transactions',
      data,
      options,
    );
    return {
      ...response,
      status: response.status ?? classifyRemitStatus(response.transactionStatus),
    };
  }

  /**
   * Retrieves the current status of a transaction using the V3 API.
   *
   * @param transactionReference - The unique reference of the transaction.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the transaction status response.
   */
  async getStatus(
    transactionReference: string,
    options?: RequestOptions,
  ): Promise<TransactionResponse> {
    const path = `/gsma/transactions_v3/${encodeURIComponent(transactionReference)}`;
    const response = await this.client.request<TransactionResponse>(
      'GET',
      path,
      undefined,
      options,
    );
    return {
      ...response,
      status: response.status ?? classifyRemitStatus(response.transactionStatus),
    };
  }

  /**
   * Cancels an initiated transaction that has not yet been credited to the recipient.
   *
   * @param data - The cancellation request details.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the cancellation response.
   */
  async cancel(
    data: CancelTransactionRequest,
    options?: RequestOptions,
  ): Promise<CancelTransactionResponse> {
    return this.client.request<CancelTransactionResponse>(
      'POST',
      '/gsma/remitCancel',
      data,
      options,
    );
  }

  /**
   * Reverses a successful transfer to return funds to the sender's account.
   *
   * @param data - The reversal request details.
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the reversal response.
   */
  async reverse(
    data: ReverseTransactionRequest,
    options?: RequestOptions,
  ): Promise<ReverseTransactionResponse> {
    return this.client.request<ReverseTransactionResponse>(
      'POST',
      '/gsma/reversalInitiate',
      data,
      options,
    );
  }
}
