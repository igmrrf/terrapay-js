export type IdentifierType = 'msisdn' | 'accountNumber' | 'pan' | 'walletId';
export type InstrumentType = 'WALLET' | 'BANK_AC' | 'CARD';

/**
 * Harmonized transaction type. Which side (sender/recipient) is a business
 * drives which KYC shape {@link TransactionRequest} requires:
 * - `p2p` — person-to-person. Both `senderKyc`/`recipientKyc` required at the
 *   top level; see {@link PersonalTransactionRequest}.
 * - `b2b` — both sides are businesses; see {@link B2bTransactionRequest}.
 * - `b2p` — business sender, personal recipient; see {@link B2pTransactionRequest}.
 * - `p2b` — personal sender, business recipient; see {@link P2bTransactionRequest}.
 *
 * Business KYC nests under `business.senderKyc` / `business.recepientKyc`
 * (note the API's own spelling of "recepient") using {@link BusinessKyc}, and
 * `paymentMode` / `paymentOption` become mandatory for any business type.
 */
export type TransactionType = 'p2p' | 'p2b' | 'b2b' | 'b2p';

/** The business-flow subset of {@link TransactionType} — any type with a business party. */
export type BusinessTransactionType = 'p2b' | 'b2b' | 'b2p';

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
