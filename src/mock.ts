import { TerraPay } from './terrapay.js';
import type {
  AccountStatusResponse,
  QuotationResponse,
  TransactionResponse,
} from './types/index.js';

/**
 * A mock version of the TerraPay SDK for use in unit tests.
 * All methods return predictable, static responses without making network calls.
 */
export class MockTerraPay extends TerraPay {
  constructor() {
    super({
      username: 'mock',
      password: 'mock',
      originCountry: 'US',
      environment: 'uat',
    });
  }

  // Override resources with mock implementations if needed,
  // or provide a helper to inject custom responses.

  public static createDefaultResponses() {
    return {
      accountStatus: { status: 'available', subStatus: '6000:Success' } as AccountStatusResponse,
      quotation: {
        requestDate: '2023-10-27 10:00:00',
        requestAmount: '100.00',
        requestCurrency: 'USD',
        quotationReference: 'MOCK_QUOTE_123',
        quotationStatus: '2000:Quote Success',
        debitParty: [{ key: 'msisdn', value: '+4491509874561' }],
        creditParty: [{ key: 'msisdn', value: '' }],
        quotes: [
          {
            quoteId: 'MOCK_QUOTE_ID',
            quoteExpiryTime: '2023-10-28 10:00:00',
            sendingAmount: '100.00',
            sendingCurrency: 'USD',
            receivingAmount: '150.00',
            receivingCurrency: 'EUR',
            fxRate: '1.5',
            scheme: '',
            type: 'p2p',
            instrumentType: 'WALLET',
          },
        ],
      } as QuotationResponse,
      transaction: {
        transactionReference: 'MOCK_TX_123',
        transactionStatus: '3000:Remit Success',
        status: 'SUCCESS',
        amount: '100.00',
        currency: 'USD',
        type: 'p2p',
        requestDate: '2023-10-27 10:00:00',
        requestingOrganisationTransactionReference: 'PARTNER_REF',
      } as TransactionResponse,
    };
  }
}
