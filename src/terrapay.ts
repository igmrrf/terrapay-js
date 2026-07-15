import { BaseClient } from './core/client.js';
import { Accounts } from './resources/accounts.js';
import { Ancillary } from './resources/ancillary.js';
import { Quotations } from './resources/quotations.js';
import { Reports } from './resources/reports.js';
import { Transactions } from './resources/transactions.js';
import type { TerraPayConfig } from './types/index.js';

/**
 * The main TerraPay SDK entry point.
 * Use this class to access all API modules such as accounts, transactions, and quotations.
 *
 * @example
 * ```typescript
 * const sdk = new TerraPay({
 *   username: 'your_user',
 *   password: 'your_password',
 *   originCountry: 'GB',
 *   environment: 'uat'
 * });
 *
 * const balance = await sdk.accounts.getBalance('254700000000');
 * ```
 */
export class TerraPay {
  /**
   * Module for managing accounts, balances, and KYC status.
   */
  public accounts: Accounts;

  /**
   * Module for price discovery and forex quotation.
   */
  public quotations: Quotations;

  /**
   * Module for initiating, status-checking, and reversing transactions.
   */
  public transactions: Transactions;

  /**
   * Module for ancillary operations like bank/agent lookups and currency lists.
   */
  public ancillary: Ancillary;

  /**
   * Module for generating and fetching transaction reports.
   */
  public reports: Reports;

  /**
   * Internal HTTP client used by the modules.
   */
  public readonly client: BaseClient;

  /**
   * Initializes a new instance of the TerraPay SDK.
   *
   * @param config - Configuration settings for the SDK.
   */
  constructor(config: TerraPayConfig) {
    this.client = new BaseClient(config);

    // Initialize Domain Modules
    this.accounts = new Accounts(this.client);
    this.quotations = new Quotations(this.client);
    this.transactions = new Transactions(this.client);
    this.ancillary = new Ancillary(this.client);
    this.reports = new Reports(this.client);
  }
}

/**
 * Lazily builds and caches one {@link TerraPay} client per key — for
 * integrators running multiple partner accounts (each with its own
 * credentials) against the same integration. Per-call retry-variant
 * selection (e.g. a no-retry client for create/cancel/reverse) stays
 * application-specific: pass a different `maxRetries` per config entry and
 * build that distinction yourself if you need it.
 *
 * @example
 * ```typescript
 * const clients = createTerraPayClients({
 *   acme: { username: 'acme_user', password: '...', originCountry: 'US', environment: 'production' },
 *   globex: { username: 'globex_user', password: '...', originCountry: 'GB', environment: 'production' },
 * });
 * const balance = await clients.get('acme').reports.getLedgerBalance();
 * ```
 */
export function createTerraPayClients<K extends string>(
  configs: Record<K, TerraPayConfig>,
): { get(key: K): TerraPay } {
  const cache = new Map<K, TerraPay>();
  return {
    get(key: K): TerraPay {
      let client = cache.get(key);
      if (!client) {
        client = new TerraPay(configs[key]);
        cache.set(key, client);
      }
      return client;
    },
  };
}
