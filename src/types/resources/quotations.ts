import type { Party, SchemeValue, TransactionType } from './common.js';

export interface QuoteRequestItem {
  sendingCurrency: string;
  receivingCurrency: string;
}

export interface QuotationRequest {
  requestDate: string;
  type?: TransactionType;
  scheme?: SchemeValue;
  debitParty?: Party[];
  creditParty: Party[];
  requestAmount: string;
  requestCurrency: string;
  quotes: QuoteRequestItem[];
}

export interface QuoteResponseItem {
  quoteId: string;
  quoteExpiryTime: string;
  sendingAmount: string;
  sendingCurrency: string;
  receivingAmount: string;
  receivingCurrency: string;
  fxRate: string;
  scheme: string;
  type: string;
  instrumentType: string;
}

export interface QuotationResponse {
  requestDate: string;
  requestAmount: string;
  requestCurrency: string;
  quotationReference: string;
  quotationStatus: string;
  debitParty: Party[];
  creditParty: Party[];
  quotes: QuoteResponseItem[];
  type?: string;
  scheme?: string;
}

/**
 * A single corridor rate returned by the Corridor Quotation V2 API.
 */
export interface CorridorQuoteItemV2 {
  receivingCurrency: string;
  fxRate: string;
  transactionType: string;
  instrumentType: string;
  scheme: string;
}

/**
 * Response of the Corridor Quotation V2 API ({@link Quotations.getCorridorRates})
 */
export interface CorridorQuotationResponseV2 {
  requestDate: string;
  requestCurrency: string;
  quotes: CorridorQuoteItemV2[];
  /** Status of the request, format `code:message` (e.g. `9000:Success`). */
  quotationStatus: string;
}

/**
 * A single corridor rate returned by the Corridor Quotation V3 API.
 */
export interface CorridorQuoteItemV3 {
  receivingCurrency: string;
  fxRate: string;
  transactionType: string;
  instrumentType: string;
  scheme: string;
  /** Payout country (ISO Alpha-2). Rates can vary by country. */
  country: string;
  /** Vertical type the rate applies to (`*` = all). */
  verticalTypes: string;
}

/**
 * Response of the Corridor Quotation V3 API ({@link Quotations.getCorridorRatesV3})
 */
export interface CorridorQuotationResponseV3 {
  requestDate: string;
  requestCurrency: string;
  quotes: CorridorQuoteItemV3[];
  /** Status of the request, format `code:message` (e.g. `9000:Success`). */
  quotationStatus: string;
}

export type CorridorQuoteItem = CorridorQuoteItemV2 | CorridorQuoteItemV3;
export type CorridorQuotationResponse = CorridorQuotationResponseV2 | CorridorQuotationResponseV3;
