export interface Bank {
  bankName: string;
  bankCode: string;
  providerCode: string;
  status: string;
}

export interface BankListResponse {
  countryCode: string;
  lastUpdatedOn?: string;
  banks: Bank[];
}

/**
 * A wallet option for a destination country/instrument. `providerCode` is
 * the value to set as {@link BaseTransactionRequest.provider} when the payer
 * selects this wallet — TerraPay validates that the transaction's `provider`
 * matches what was sent in the earlier validation request. See
 * {@link describeProviderRequirement} for which countries are confirmed to
 * require it.
 */
export interface Wallet {
  walletName: string;
  providerCode: string;
}

export interface WalletListResponse {
  countryCode: string;
  wallets: Wallet[];
}

/**
 * Whether {@link BaseTransactionRequest.provider} is known to be mandatory
 * for a destination country. Only two corridors are confirmed from
 * TerraPay's own parameter docs (Colombia Bre-B `CO`, Egypt INSTAPAY `EG`) —
 * every other country returns `'unknown'`, NOT `'optional'`. Absence of
 * evidence isn't evidence of absence: don't treat `'unknown'` as "this field
 * can be skipped". Confirm via a live sandbox call (or TerraPay support)
 * before assuming `provider` can be omitted for a country not listed here.
 */
export function describeProviderRequirement(country: string): 'mandatory' | 'unknown' {
  const MANDATORY_PROVIDER_COUNTRIES = new Set(['CO', 'EG']);
  return MANDATORY_PROVIDER_COUNTRIES.has(country.toUpperCase()) ? 'mandatory' : 'unknown';
}

export interface FileUploadParams {
  /** Whose document this is, e.g. 'sender' or 'recipient' */
  customerType: string;
  /** Document type, e.g. 'Invoice' */
  docType: string;
  /** The transaction the document is attached to */
  transactionId: string;
}

export interface FileUploadResponse {
  /** Status of the upload, e.g. `19000` (success) or `19001` (failed). */
  responseCode?: string;
  responseMessage?: string;
}
