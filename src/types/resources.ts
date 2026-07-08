export type IdentifierType = 'msisdn' | 'accountNumber' | 'pan' | 'walletId';
export type InstrumentType = 'WALLET' | 'BANK_AC' | 'CARD';
export type TransactionType = 'p2p' | 'p2b' | 'b2b' | 'b2p';

/**
 * Known country/instrument-specific scheme codes for the `scheme` field.
 * See {@link SCHEMES} for the full metadata table (country, instrument, remarks).
 */
export type TransactionScheme =
  | 'MC'
  | 'VISA'
  | 'UP'
  | 'BANBOG'
  | 'BANCOL'
  | 'NEQUI'
  | 'AIRMWI'
  | 'TNMMPA'
  | 'PC'
  | 'ACH'
  | 'ACHSAMEDAY'
  | 'CHIPS'
  | 'FEDWIRE'
  | 'INSTANT';

/**
 * Allows a known {@link TransactionScheme} (with autocomplete) while still
 * permitting any other string the API may accept.
 */
export type SchemeValue = TransactionScheme | (string & {});

export interface SchemeInfo {
  /** Country the scheme applies to, or 'All Countries'. */
  country: string;
  scheme: TransactionScheme;
  instrumentType: InstrumentType;
  remarks: string;
}

/**
 * Country/instrument-specific scheme codes supported by TerraPay.
 */
export const SCHEMES: readonly SchemeInfo[] = [
  {
    country: 'All Countries',
    scheme: 'MC',
    instrumentType: 'CARD',
    remarks: 'Mastercard specific offered rates are available.',
  },
  {
    country: 'All Countries',
    scheme: 'VISA',
    instrumentType: 'CARD',
    remarks: 'Visa specific offered rates are available.',
  },
  {
    country: 'China',
    scheme: 'UP',
    instrumentType: 'CARD',
    remarks: 'UnionPay specific offered rates are available.',
  },
  {
    country: 'Colombia',
    scheme: 'BANBOG',
    instrumentType: 'BANK_AC',
    remarks: 'Banco Bogota bank specific offered rates are available.',
  },
  {
    country: 'Colombia',
    scheme: 'BANCOL',
    instrumentType: 'BANK_AC',
    remarks: 'Bancolombia bank specific offered rates are available.',
  },
  {
    country: 'Colombia',
    scheme: 'NEQUI',
    instrumentType: 'WALLET',
    remarks: 'Nequi wallet specific offered rates are available.',
  },
  {
    country: 'Malawi',
    scheme: 'AIRMWI',
    instrumentType: 'WALLET',
    remarks: 'Airtel wallet specific offered rates are available.',
  },
  {
    country: 'Malawi',
    scheme: 'TNMMPA',
    instrumentType: 'WALLET',
    remarks: 'TNM Wallet specific offered rates are available.',
  },
  {
    country: 'Ukraine',
    scheme: 'PC',
    instrumentType: 'CARD',
    remarks: 'PROSTIR Card specific offered rates are available.',
  },
  {
    country: 'USA',
    scheme: 'ACH',
    instrumentType: 'BANK_AC',
    remarks: 'Used to identify transfer modes; no specific offered rates available.',
  },
  {
    country: 'USA',
    scheme: 'ACHSAMEDAY',
    instrumentType: 'BANK_AC',
    remarks: 'Used to identify transfer modes; no specific offered rates available.',
  },
  {
    country: 'USA',
    scheme: 'CHIPS',
    instrumentType: 'BANK_AC',
    remarks: 'Used to identify transfer modes; no specific offered rates available.',
  },
  {
    country: 'USA',
    scheme: 'FEDWIRE',
    instrumentType: 'BANK_AC',
    remarks: 'Used to identify transfer modes; no specific offered rates available.',
  },
  {
    country: 'USA',
    scheme: 'INSTANT',
    instrumentType: 'BANK_AC',
    remarks: 'Used to identify transfer modes; no specific offered rates available.',
  },
];

/** Name-match result codes returned by account/PAN verification. */
export type NameMatchStatus = 'MTCH' | 'CMTC' | 'NMTC' | 'NOAP';

/** Account-match result codes (a subset of {@link NameMatchStatus}). */
export type AccountMatchStatus = 'MTCH' | 'NMTC' | 'NOAP';

export interface MatchStatusInfo {
  category: 'Success' | 'Verification Failed';
  definition: string;
}

/**
 * Metadata for name/account-match status codes returned by verification calls.
 */
export const NAME_MATCH_STATUSES: Readonly<Record<NameMatchStatus, MatchStatusInfo>> = {
  MTCH: { category: 'Success', definition: 'Account is valid and name matched (exact match)' },
  CMTC: {
    category: 'Success',
    definition: 'Account is valid and name is closely/partially matched',
  },
  NMTC: { category: 'Verification Failed', definition: 'Account and Name do not match.' },
  NOAP: {
    category: 'Success',
    definition:
      'Verification check not possible or TerraPay does not support the specified country.',
  },
};

export interface Party {
  key: string;
  value: string;
}

export interface IdDocument {
  idType: string;
  idNumber: string;
  issueDate?: string;
  expiryDate?: string;
  issuerCountry?: string;
}

/**
 * ID document for the SENDER. The API marks `expiryDate` mandatory for the
 * sender (it is only conditional for the recipient), so it is required here.
 */
export interface SenderIdDocument {
  idType: string;
  idNumber: string;
  expiryDate: string;
  issueDate?: string;
  issuerCountry?: string;
}

export interface PostalAddress {
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  city: string;
  stateProvince?: string;
  postalCode?: string;
  country: string;
}

export interface SubjectName {
  title?: string;
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  regionalBeneficiaryName?: string;
}

/**
 * Sender KYC. Fields the API marks Mandatory for the sender are required:
 * `nationality`, `dateOfBirth`, `subjectName`, `postalAddress`, and `idDocument`
 * (with its mandatory `expiryDate`). Others are optional/conditional.
 */
export interface SenderKyc {
  nationality: string;
  dateOfBirth: string;
  subjectName: SubjectName;
  postalAddress: PostalAddress;
  idDocument: SenderIdDocument[];
  countryOfBirth?: string;
  cityOfBirth?: string;
  gender?: 'M' | 'F' | 'U';
  primaryContactCountryCode?: string;
  primaryContactNo?: string;
  primaryContactNoType?: string;
  emailAddress?: string;
}

/**
 * Recipient KYC. Only `subjectName` (first/last/full name) is unconditionally
 * mandatory for the beneficiary; everything else is optional or destination-specific.
 */
export interface RecipientKyc {
  subjectName: SubjectName;
  nationality?: string;
  dateOfBirth?: string;
  countryOfBirth?: string;
  cityOfBirth?: string;
  emailAddress?: string;
  idDocument?: IdDocument[];
  postalAddress?: PostalAddress;
}

export interface BusinessKyc {
  businessName: string;
  businessPINCode?: string;
  businessAddress1?: string;
  businessAddress2?: string;
  businessAddressCity?: string;
  businessAddressState?: string;
  businessAddressCountryCode?: string;
  businessAddressZip?: string;
  businessPrimaryContactCountryCode?: string;
  businessPrimaryContactNo?: string;
  businessPrimaryContactNoType?: string;
  businessDescription?: string;
  businessEmail?: string;
  businessCountryCode?: string;
  businessRegistrationType?: string;
  businessRegistrationNumber?: string;
  businessRegistrationIssueDate?: string;
  businessIDValidThru?: string;
  businessRegistrationIssuedBy?: string;
  businessRegistrationIssuedAt?: string;
  typeofbusiness?: string;
  businessPObox?: string;
  businessMobile?: string;
}

export interface InternationalTransferInformation {
  quoteId: string;
  receivingCountry: string;
  remittancePurpose: string;
  sourceOfFunds: string;
  /** Relationship of sender to beneficiary. Mandatory per the API. */
  relationshipSender: string;
}

// --- Account Types ---

/**
 * Query parameters for {@link Accounts.getStatus}. Covers both mobile-wallet
 * and bank-account verification; the applicable fields depend on the identifier
 * type and destination country.
 */
export interface AccountStatusParams {
  /**
   * Beneficiary full name as registered with the wallet provider / bank (`bnv`),
   * used for name matching. Mandatory per the API for name verification. 1–180 chars.
   */
  bnv: string;
  /**
   * Sender full name as registered with the sending partner (`snv`). Optional.
   * 1–50 chars for bank, 1–180 for wallet.
   */
  snv?: string;
  /**
   * Wallet/bank provider code (`provider`). Conditional: mandatory for PSP
   * wallets and destination-specific corridors (e.g. `CO_BREB_PAY` for Colombia
   * Bre-B, `EG_INSTAPAY` for Egypt INSTAPAY). 5–20 chars.
   */
  provider?: string;
  /**
   * Bank code (`bankcode`) as required in the destination country — IFSC for
   * India, SWIFT BIC elsewhere. Conditional: optional only if `accountId` is an
   * IBAN. 4–32 chars. (Bank accounts.)
   */
  bankcode?: string;
  /** Full name of the beneficiary bank (`bankname`). Mandatory for bank accounts. 4–128 chars. */
  bankname?: string;
  /** ISO Alpha-2 country code of the destination country (`country`). Mandatory for bank/card. */
  country?: string;
  /** Beneficiary mobile number with country code (`msisdn`). Conditional, country-specific. 3–50 chars. */
  msisdn?: string;
  /**
   * Branch code (`banksubcode`) — routing number, routing code, or sort code as
   * required in the destination country. Conditional, country-specific. 1–50 chars.
   */
  banksubcode?: string;
  /** Bank account type (`accounttype`): `Checking` or `Savings`. Conditional; defaults to Savings for p2p. */
  accounttype?: string;
  /** Beneficiary ID document type (`beneficiaryidtype`). Optional. */
  beneficiaryidtype?: string;
  /** Beneficiary ID document number (`idnumber`). Optional. */
  idnumber?: string;
}

/**
 * Query parameters for {@link Accounts.getPanStatus} (card/PAN verification).
 */
export interface PanStatusParams {
  /** Full beneficiary name as displayed on the card (`bnv`). Mandatory. 1–180 chars. */
  bnv: string;
  /** ISO Alpha-2 country code of the destination country (`country`). Mandatory. */
  country: string;
  /** Beneficiary mobile number with country code (`msisdn`). Conditional, country-specific. 3–50 chars. */
  msisdn?: string;
}

export interface AccountStatusResponse {
  status: 'available' | 'unavailable' | 'unregistered';
  subStatus?: string;
  lei?: string;
  /** Name-match result when a beneficiary name (bnv) was supplied. */
  nameMatch?: NameMatchStatus;
}

export interface TerraPayVerifyRequest {
  beneficiaryName?: string;
  instrumentType: 'Bank' | 'Card' | 'Wallet';
  country: string;
  bankCode?: string;
  bankName?: string;
  bankSubCode?: string;
  paymentRef: string;
  provider?: string;
  idType?: string;
  idNumber?: string;
  additionalInfo?: string;
}

export interface TerraPayVerifyResponse {
  accountMatch: AccountMatchStatus;
  nameMatch: NameMatchStatus;
  verificationId: string;
  verificationDate: string;
  statusCode?: string;
  statusMessage?: string;
  errors?: string;
}

// --- Quotation Types ---

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
  quoteExpiryTime?: string;
  sendingAmount: string;
  sendingCurrency: string;
  receivingAmount: string;
  receivingCurrency: string;
  fxRate: string;
  scheme?: string;
  type?: string;
  instrumentType?: string;
}

export interface QuotationResponse {
  requestDate: string;
  requestCurrency?: string;
  quotationReference?: string;
  quotationStatus?: string;
  debitParty?: Party[];
  creditParty?: Party[];
  quotes: QuoteResponseItem[];
}

/**
 * A single corridor rate returned by the Corridor Quotation API. Unlike
 * {@link QuoteResponseItem} (a firm, bookable quote), a corridor rate is an
 * indicative FX rate for a currency pair — it has no `quoteId` or amounts.
 */
export interface CorridorQuoteItem {
  receivingCurrency: string;
  fxRate: string;
  /** May be null/absent if not applicable. */
  transactionType?: string;
  /** May be null/absent if not applicable. */
  instrumentType?: string;
  /** May be null/absent if not applicable. */
  scheme?: string;
  /** Payout country (ISO Alpha-2). Rates can vary by country. V3 only. */
  country?: string;
  /** Vertical type the rate applies to (`*` = all). V3 only. */
  verticalTypes?: string;
}

/**
 * Response of the Corridor Quotation API ({@link Quotations.getCorridorRates}
 * and {@link Quotations.getCorridorRatesV3}) — indicative rates for a prefunding
 * currency, grouped by receiving currency.
 */
export interface CorridorQuotationResponse {
  requestDate: string;
  requestCurrency: string;
  quotes: CorridorQuoteItem[];
  /** Status of the request, format `code:message` (e.g. `9000:Success`). */
  quotationStatus?: string;
}

// --- Transaction Types ---

export interface TransactionRequest {
  amount: string;
  currency: string;
  type: TransactionType;
  scheme?: SchemeValue;
  descriptionText?: string | null;
  requestDate: string;
  requestingOrganisationTransactionReference: string;
  provider?: string;
  sendingAmount?: string;
  payinCcyCode?: string;
  paymentMode?: string;
  authenticationPartnerCode?: string;
  paymentOption?: string;
  sendingPartnerCode?: string;
  receivingPartnerCode?: string;
  kidNumber?: string;
  debitParty: Party[];
  creditParty: Party[];
  // Personal KYC. Optional at the top level because business flows (b2b/b2p/p2b)
  // supply `business.*` instead; when present, the strict SenderKyc/RecipientKyc
  // types enforce the fields the API marks mandatory.
  senderKyc?: SenderKyc;
  recipientKyc?: RecipientKyc;
  internationalTransferInformation?: InternationalTransferInformation;
  business?: {
    senderKyc?: BusinessKyc;
    recepientKyc?: BusinessKyc;
  };
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
  status?:
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

// --- Ancillary Types ---

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

export interface Wallet {
  walletName: string;
  providerCode: string;
}

export interface WalletListResponse {
  countryCode: string;
  wallets: Wallet[];
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

// --- Reports Types ---

export interface StatementItem {
  creationTime: string;
  modifiedTime: string;
  type: 'TRANSFERRED' | 'REJECTED' | 'BOUNCED' | 'LIQUIDITY' | 'PENDING';
  internalRef: string;
  amount: string;
  currency: string;
  balance: string;
  message: string;
  /** Partner transaction reference. Optional for LIQUIDITY, mandatory otherwise. */
  externalRef?: string;
  /** Converted (payout) amount. Optional for LIQUIDITY, mandatory otherwise. */
  convertedAmount?: string;
  /** Currency of {@link convertedAmount}. Optional for LIQUIDITY, mandatory otherwise. */
  convertedCurrency?: string;
}

export type StatementsResponse = StatementItem[];

export interface LedgerBalanceItem {
  currency: string;
  currentBalance: string;
  account: string;
  status: string;
}

export type LedgerBalanceResponse = LedgerBalanceItem[];
