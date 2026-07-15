import type { AccountMatchStatus, NameMatchStatus } from './common.js';

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
