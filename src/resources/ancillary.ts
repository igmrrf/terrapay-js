import type { BaseClient } from '../core/client.js';
import type {
  BankListResponse,
  FileUploadParams,
  FileUploadResponse,
  RequestOptions,
  WalletListResponse,
} from '../types/index.js';

/**
 * Provides access to ancillary data such as lists of supported banks and wallets.
 */
export class Ancillary {
  constructor(private readonly client: BaseClient) {}

  /**
   * Retrieves the list of supported banks and their codes for a specific country.
   *
   * @param countryCode - ISO Alpha-2 country code (e.g., 'KE').
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the list of supported banks.
   */
  async getBanks(countryCode: string, options?: RequestOptions): Promise<BankListResponse> {
    const path = `/getbanklist/${encodeURIComponent(countryCode)}`;
    return this.client.request<BankListResponse>('GET', path, undefined, options);
  }

  /**
   * Retrieves the list of supported mobile wallets and their provider codes for a specific country.
   *
   * @param countryCode - ISO Alpha-2 country code (e.g., 'KE').
   * @param options - Optional request-specific configuration.
   * @returns A promise resolving to the list of supported mobile wallets.
   */
  async getWallets(countryCode: string, options?: RequestOptions): Promise<WalletListResponse> {
    const path = `/getwalletlist/${encodeURIComponent(countryCode)}`;
    return this.client.request<WalletListResponse>('GET', path, undefined, options);
  }

  /**
   * Uploads a supporting document (e.g. KYC/compliance) for a transaction.
   * The file is sent as multipart/form-data.
   *
   * @param file - The file to upload (Blob or File)
   * @param params - customerType, docType and transactionId query parameters
   * @param options - Optional request configuration (timeout, correlationId)
   */
  async uploadFile(
    file: Blob,
    params: FileUploadParams,
    options?: RequestOptions,
  ): Promise<FileUploadResponse> {
    const form = new FormData();
    form.append('file', file);

    const query = new URLSearchParams({
      customerType: params.customerType,
      docType: params.docType,
      transactionId: params.transactionId,
    }).toString();

    const path = `/fileUpload?${query}`;
    return this.client.request<FileUploadResponse>('POST', path, form, options);
  }
}
