import type {
  BusinessKyc,
  InternationalTransferInformation,
  Party,
  RecipientKyc,
  SchemeValue,
  SenderKyc,
  TransactionType,
} from './common.js';

/**
 * Fields shared by every transaction type, regardless of whether either party
 * is a business. See {@link PersonalTransactionRequest}, {@link B2bTransactionRequest},
 * {@link B2pTransactionRequest}, and {@link P2bTransactionRequest} for the
 * `type`-dependent fields (`paymentMode`, `paymentOption`, KYC shape) that this
 * base omits.
 */
export interface BaseTransactionRequest {
  amount: string;
  currency: string;
  scheme?: SchemeValue;
  descriptionText?: string | null;
  requestDate: string;
  requestingOrganisationTransactionReference: string;
  /**
   * Wallet/bank provider code. Must match the value sent in the validation
   * request, or the transaction is rejected. Conditional: mandatory/optional
   * depends on the destination country (e.g. `CO_BREB_PAY` is mandatory for
   * Colombia Bre-B). See {@link describeProviderRequirement}.
   */
  provider?: string;
  sendingAmount?: string;
  payinCcyCode?: string;
  authenticationPartnerCode?: string;
  sendingPartnerCode?: string;
  /**
   * Unique receive-partner code. Named `recievingPartnerCode` (sic) in
   * TerraPay's own parameter docs — if requests silently drop this field
   * server-side, confirm against a live sandbox call whether the wire key
   * needs the misspelling, similar to `business.recepientKyc` below.
   */
  receivingPartnerCode?: string;
  kidNumber?: string;
  debitParty: Party[];
  creditParty: Party[];
  internationalTransferInformation?: InternationalTransferInformation;
  /**
   * FX rate from the quote this transaction fulfills. Not part of TerraPay's
   * documented request schema — a pass-through convenience for callers who
   * build their own ledger and need to carry the quote's rate through to the
   * remit call. Harmless extra field if the API ignores it.
   */
  fxRate?: string | null;
  /**
   * Receiving-side amount from the quote this transaction fulfills. Same
   * pass-through rationale as {@link BaseTransactionRequest.fxRate}.
   */
  receivingAmount?: string | null;
}

/**
 * Person-to-person transaction (`type: 'p2p'`). Both `senderKyc` and
 * `recipientKyc` are required — TerraPay's error `3010` ("Mandatory KYC
 * parameter check failed") is the enforcement mechanism on the wire.
 * `paymentMode` / `paymentOption` are optional (unlike business flows, where
 * TerraPay marks both mandatory).
 */
export interface PersonalTransactionRequest extends BaseTransactionRequest {
  type: 'p2p';
  paymentMode?: string;
  paymentOption?: string;
  senderKyc: SenderKyc;
  recipientKyc: RecipientKyc;
}

/**
 * Business-to-business transaction (`type: 'b2b'`). Both sides are
 * businesses: KYC nests under `business.senderKyc` / `business.recepientKyc`
 * using {@link BusinessKyc} — note the API's own spelling of "recepient".
 * `paymentMode` / `paymentOption` are mandatory (unlike `p2p`).
 */
export interface B2bTransactionRequest extends BaseTransactionRequest {
  type: 'b2b';
  paymentMode: string;
  paymentOption: string;
  business: {
    senderKyc: BusinessKyc;
    recepientKyc: BusinessKyc;
  };
}

/**
 * Business-to-person transaction (`type: 'b2p'`): business sender, personal
 * recipient. Sender KYC nests under `business.senderKyc`; recipient KYC is
 * the personal `recipientKyc` at the top level. `paymentMode` /
 * `paymentOption` are mandatory.
 */
export interface B2pTransactionRequest extends BaseTransactionRequest {
  type: 'b2p';
  paymentMode: string;
  paymentOption: string;
  business: {
    senderKyc: BusinessKyc;
  };
  recipientKyc: RecipientKyc;
}

/**
 * Person-to-business transaction (`type: 'p2b'`): personal sender, business
 * recipient. Sender KYC is the personal `senderKyc` at the top level;
 * recipient KYC nests under `business.recepientKyc`. `paymentMode` /
 * `paymentOption` are mandatory.
 */
export interface P2bTransactionRequest extends BaseTransactionRequest {
  type: 'p2b';
  paymentMode: string;
  paymentOption: string;
  senderKyc: SenderKyc;
  business: {
    recepientKyc: BusinessKyc;
  };
}

/**
 * Request body for {@link Transactions.create}. A discriminated union on
 * `type`: `p2p` requires personal `senderKyc`/`recipientKyc`; `b2b`/`b2p`/`p2b`
 * require `business`, `paymentMode`, and `paymentOption`, with the business
 * side(s) determined by which type is selected. Use {@link getBusinessSide}
 * for a runtime answer when only a bare {@link TransactionType} is in hand.
 */
export type TransactionRequest =
  | PersonalTransactionRequest
  | B2bTransactionRequest
  | B2pTransactionRequest
  | P2bTransactionRequest;

/**
 * Which side(s) of a transaction are a business, given its {@link TransactionType}.
 * Runtime companion to the {@link TransactionRequest} union for code that only
 * has a bare `type` value (e.g. building a form before the rest of the request
 * exists).
 */
export function getBusinessSide(type: TransactionType): 'sender' | 'recipient' | 'both' | 'none' {
  switch (type) {
    case 'b2b':
      return 'both';
    case 'b2p':
      return 'sender';
    case 'p2b':
      return 'recipient';
    case 'p2p':
      return 'none';
  }
}

export interface TransactionResponse {
  amount: string;
  currency: string;
  type: string;
  requestDate: string;
  requestingOrganisationTransactionReference: string;
  debitParty?: Party[];
  creditParty?: Party[];
  transactionStatus: string;
  transactionReference: string;
  /**
   * Authoritative final-status field. Per TerraPay, use THIS (not
   * `transactionStatus`) to decide whether to refund the sender.
   * - `SUCCESS` paid out — do not refund.
   * - `FAILED` / `CANCELLED` / `RETURNED` — refund sender.
   * - `PENDING` / `REVERSAL PENDING` / `REVERSAL REJECTED` — do not refund; keep polling.
   */
  status:
    | 'SUCCESS'
    | 'PENDING'
    | 'FAILED'
    | 'CANCELLED'
    | 'RETURNED'
    | 'REVERSAL PENDING'
    | 'REVERSAL REJECTED';
  creditingOrganisationTransactionReference?: string;
}

export interface CancelTransactionRequest {
  /** TerraPay or partner transaction reference. Mandatory. */
  txnId: string;
  /** Free-text cancellation reason. Optional (not required by the API). */
  reason?: string;
}

export interface CancelTransactionResponse {
  statusCode?: string;
  responseMessage?: string;
}

export interface ReverseTransactionRequest {
  /** TerraPay or partner transaction reference. Mandatory. */
  txnId: string;
  /** Free-text reversal reason. Optional (not required by the API). */
  reversalReason?: string;
}

export interface ReverseTransactionResponse {
  responseCode?: string;
  responseMessage?: string;
  txnId?: string;
}
