export type IdentifierType = 'msisdn' | 'accountNumber' | 'pan' | 'walletId';
export type InstrumentType = 'WALLET' | 'BANK_AC' | 'CARD';
export type TransactionType = 'p2p' | 'p2b' | 'b2b' | 'b2p';

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

export interface KycDetails {
  nationality?: string;
  dateOfBirth?: string;
  countryOfBirth?: string;
  cityOfBirth?: string;
  gender?: 'M' | 'F' | 'U';
  primaryContactCountryCode?: string;
  primaryContactNo?: string;
  primaryContactNoType?: string;
  emailAddress?: string;
  idDocument?: IdDocument[];
  postalAddress?: PostalAddress;
  subjectName?: SubjectName;
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
  relationshipSender?: string;
}

// --- Account Types ---

export interface AccountStatusResponse {
  status: 'available' | 'unavailable' | 'unregistered';
  subStatus?: string;
  lei?: string;
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
  accountMatch: 'MTCH' | 'NMTC' | 'NOAP';
  nameMatch: 'MTCH' | 'CMTC' | 'NMTC' | 'NOAP';
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
  scheme?: string;
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

// --- Transaction Types ---

export interface TransactionRequest {
  amount: string;
  currency: string;
  type: TransactionType;
  scheme?: string;
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
  senderKyc?: KycDetails;
  recipientKyc?: KycDetails;
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
  status?: 'SUCCESS' | 'PENDING' | 'FAILED' | 'CANCELLED' | 'RETURNED';
  creditingOrganisationTransactionReference?: string;
}

export interface CancelTransactionRequest {
  reason: string;
  txnId: string;
}

export interface CancelTransactionResponse {
  statusCode?: string;
  responseMessage?: string;
}

export interface ReverseTransactionRequest {
  reversalReason: string;
  txnId: string;
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
  statusCode?: string;
  responseMessage?: string;
  documentId?: string;
}

// --- Reports Types ---

export interface StatementItem {
  creationTime: string;
  modifiedTime: string;
  type: 'TRANSFERRED' | 'REJECTED' | 'BOUNCED' | 'LIQUIDITY' | 'PENDING';
  internalRef: string;
  externalRef: string;
  amount: string;
  currency: string;
  convertedAmount: string;
  convertedCurrency: string;
  balance: string;
  message: string;
}

export type StatementsResponse = StatementItem[];

export interface LedgerBalanceItem {
  currency: string;
  currentBalance: string;
  account: string;
  status: string;
}

export type LedgerBalanceResponse = LedgerBalanceItem[];
