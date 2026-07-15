export interface BaseStatementItem {
  creationTime: string;
  modifiedTime: string;
  internalRef: string;
  amount: string;
  currency: string;
  balance: string;
  message: string;
}

export interface LiquidityStatementItem extends BaseStatementItem {
  type: 'LIQUIDITY';
  /** Optional for LIQUIDITY. */
  externalRef?: string;
  /** Optional for LIQUIDITY. */
  convertedAmount?: string;
  /** Optional for LIQUIDITY. */
  convertedCurrency?: string;
}

export interface TransactionStatementItem extends BaseStatementItem {
  type: 'TRANSFERRED' | 'REJECTED' | 'BOUNCED' | 'PENDING';
  /** Partner transaction reference. Mandatory for transactions. */
  externalRef: string;
  /** Converted (payout) amount. Mandatory for transactions. */
  convertedAmount: string;
  /** Currency of convertedAmount. Mandatory for transactions. */
  convertedCurrency: string;
}

export type StatementItem = LiquidityStatementItem | TransactionStatementItem;

export type StatementsResponse = StatementItem[];

export interface LedgerBalanceItem {
  currency: string;
  currentBalance: string;
  account: string;
  status: string;
}

export type LedgerBalanceResponse = LedgerBalanceItem[];
