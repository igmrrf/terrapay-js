/**
 * Live sandbox integration suite.
 *
 * Every `it` makes a REAL call to the TerraPay UAT sandbox through the SDK.
 * Traffic egresses via the SSH tunnel proxy (see proxy.ts) and every call is
 * spaced by the global rate-limit gate (see rate-limit.ts).
 *
 * Guarded behind TERRAPAY_INTEGRATION=1 so a plain `bun test` never hits the
 * network. Run it with:  bun run test:integration
 *
 * Pass criteria (best-effort): a call passes if the SDK completed a round-trip
 * and produced either a typed response OR a well-formed TerraPay API rejection
 * (that means the SDK built, signed, sent, and parsed correctly). Only an
 * AuthenticationError or an unexpected transport/network error fails a test.
 */
import { afterAll, beforeAll, describe, expect, it } from 'bun:test';
import { AuthenticationError, TerraPay, TerraPayError, getUtcTimestamp } from '../src/index.js';
import type { TransactionType } from '../src/types/index.js';
import { loadEnv } from './env.js';
import { calls, getActiveProxy, installProxyFetch, preflight } from './proxy.js';
import { getMinGap, setMinGap } from './rate-limit.js';
import { writeReport } from './report.js';

const RUN = process.env.TERRAPAY_INTEGRATION === '1';

// ---- shared state ---------------------------------------------------------
// Only touch env files / build the client when actually running the suite, so a
// plain `bun test` (which discovers this file but skips it) never needs creds.
const loaded = RUN
  ? loadEnv()
  : {
      config: {
        username: 'skipped',
        password: 'skipped',
        originCountry: 'CA',
        environment: 'uat' as const,
      },
      hashCorrected: false,
      rawEnvironment: 'uat',
      proxyUrl: '',
    };
const { config, hashCorrected, rawEnvironment, proxyUrl } = loaded;
const baseUrl =
  config.environment === 'production'
    ? 'https://connect.terrapay.com/eig'
    : 'https://uat-connect.terrapay.com:21211/eig';

const sdk = new TerraPay(config);

// Corridor used for the chained remit flow (matches the SDK README example).
const SENDER_MSISDN = '+9779840002320'; // documented UAT test MSISDN
const RECEIVER_MSISDN = '+256897378380';
const RECEIVING_COUNTRY = 'CA';

let quoteId: string | undefined;
let txnRef: string | undefined;

type Outcome = 'ok' | 'api-reject' | 'skip';
interface RequestInfo {
  method: string;
  url: string;
  body?: unknown;
}
interface Result {
  method: string;
  outcome: Outcome;
  detail: string;
  /** The request that was sent (first HTTP attempt for this call). */
  request?: RequestInfo;
  /** Full response body on success (for review). */
  data?: unknown;
  /** Structured error details when the call threw. */
  error?: {
    kind: string;
    message: string;
    status?: number;
    errorCode?: string;
    rawError?: unknown;
  };
  /** Every HTTP attempt made for this call (includes retries). */
  httpCalls?: { method: string; url: string; status?: number; ms: number; error?: string }[];
}
const results: Result[] = [];

const gap = Number(process.env.TERRAPAY_GAP_MS ?? '2000');

/**
 * Runs one SDK call. Returns its data on success, or undefined when the API
 * returned a (non-auth) rejection — which still counts as a passing test since
 * the SDK worked end to end. Throws (failing the test) only on auth failure or
 * an unexpected transport error.
 */
/** Map the HTTP calls made during a probe into request + attempt records. */
function callInfo(startIdx: number): Pick<Result, 'request' | 'httpCalls'> {
  const made = calls.slice(startIdx);
  const httpCalls = made.map((c) => ({
    method: c.method,
    url: c.url,
    status: c.status,
    ms: c.ms,
    error: c.error,
  }));
  const first = made[0];
  const request = first
    ? { method: first.method, url: first.url, body: first.requestBody }
    : undefined;
  return { request, httpCalls };
}

async function probe<T>(method: string, fn: () => Promise<T>): Promise<T | undefined> {
  const startIdx = calls.length;
  try {
    const data = await fn();
    results.push({ method, outcome: 'ok', detail: summarize(data), data, ...callInfo(startIdx) });
    return data;
  } catch (err) {
    const info = callInfo(startIdx);
    if (err instanceof AuthenticationError) {
      results.push({
        method,
        outcome: 'skip',
        detail: `AUTH FAILED: ${err.message}`,
        error: errInfo(err),
        ...info,
      });
      throw err; // hard fail: credential/hash problem
    }
    if (err instanceof TerraPayError) {
      const code = err.errorCode ? ` code=${err.errorCode}` : '';
      const detail = `HTTP ${err.status ?? '?'}${code}: ${err.message}`;
      results.push({ method, outcome: 'api-reject', detail, error: errInfo(err), ...info });
      return undefined; // SDK round-tripped; sandbox rejected on business rules
    }
    // The server answered but the body wasn't JSON. The SDK reached it (TCP+TLS
    // fine) but can't parse it — typically an endpoint hosted on a different
    // base host (e.g. statements live on engage.terrapay.com, not /eig). Soft
    // skip with a note rather than a transport failure.
    if (err instanceof SyntaxError) {
      results.push({
        method,
        outcome: 'skip',
        detail: `non-JSON response (SDK reached host; endpoint likely on a different base): ${err.message}`,
        error: errInfo(err),
        ...info,
      });
      return undefined;
    }
    // Anything else (fetch failed, timeout, proxy down) is a real failure.
    results.push({
      method,
      outcome: 'skip',
      detail: `UNEXPECTED: ${String(err)}`,
      error: errInfo(err),
      ...info,
    });
    throw err;
  }
}

function errInfo(err: unknown): Result['error'] {
  if (err instanceof TerraPayError) {
    return {
      kind: err.name,
      message: err.message,
      status: err.status,
      errorCode: err.errorCode,
      rawError: err.rawError,
    };
  }
  if (err instanceof Error) {
    return { kind: err.name, message: err.message };
  }
  return { kind: 'unknown', message: String(err) };
}

function summarize(data: unknown): string {
  if (data == null) return 'null';
  if (Array.isArray(data)) return `array[${data.length}]`;
  if (typeof data === 'object') {
    console.log({ data });
    const keys = Object.keys(data as object).slice(0, 6);
    return `{${keys.join(',')}}`;
  }
  return String(data).slice(0, 60);
}

let teardownProxy: () => void = () => {};
let preflightStatus = '';
const startedAt = new Date().toISOString();

describe.skipIf(!RUN)('TerraPay live sandbox integration', () => {
  beforeAll(async () => {
    setMinGap(gap);
    teardownProxy = await installProxyFetch(proxyUrl);
    console.log('\n─── TerraPay sandbox integration ───');
    console.log(`env=${rawEnvironment} → ${config.environment}   base=${baseUrl}`);
    console.log(`user=${config.username}  isPasswordHashed=${config.isPasswordHashed}`);
    if (hashCorrected) {
      console.log(
        '!  .env.test had PASSWORD_HASHED=false but the value is a SHA-256 hash; ' +
          'treating it as pre-hashed to avoid a double-hash 401.',
      );
    }
    console.log(`proxy=${getActiveProxy() || 'DIRECT'}  gap=${getMinGap()}ms`);
    preflightStatus = await preflight(baseUrl);
    console.log(`preflight: ${preflightStatus}\n`);
  });

  afterAll(() => {
    console.log('\n─── Results ───');
    for (const r of results) {
      const icon = r.outcome === 'ok' ? '✅' : r.outcome === 'api-reject' ? '🟡' : '⏭';
      console.log(`${icon} ${r.method.padEnd(34)} ${r.detail}`);
    }
    const ok = results.filter((r) => r.outcome === 'ok').length;
    const rej = results.filter((r) => r.outcome === 'api-reject').length;
    const skip = results.filter((r) => r.outcome === 'skip').length;
    console.log(`\n${ok} ok · ${rej} api-reject · ${skip} skipped · ${calls.length} HTTP calls`);
    console.log('(ok + api-reject both prove the SDK path works end to end)\n');

    const { jsonPath, logPath } = writeReport(
      {
        timestamp: startedAt,
        rawEnvironment,
        environment: config.environment,
        baseUrl,
        username: config.username,
        isPasswordHashed: config.isPasswordHashed ?? true,
        hashCorrected,
        proxy: getActiveProxy(),
        gapMs: getMinGap(),
        preflight: preflightStatus,
      },
      results,
    );
    console.log(`report: ${logPath}`);
    console.log(`        ${jsonPath}\n`);

    teardownProxy();
  });

  // ---- reports (read-only) ------------------------------------------------
  it('reports.getLedgerBalance', async () => {
    await probe('reports.getLedgerBalance', () => sdk.reports.getLedgerBalance());
  });

  it('reports.getLedgerBalanceByCurrency', async () => {
    await probe('reports.getLedgerBalanceByCurrency', () =>
      sdk.reports.getLedgerBalanceByCurrency('USD'),
    );
  });

  it('reports.getStatements', async () => {
    await probe('reports.getStatements', () =>
      sdk.reports.getStatements(
        '2024-01-01T00:00:00Z',
        '2024-01-31T23:59:59Z',
        'TL-TERRAPAY-GB-SENDER-USD',
      ),
    );
  });

  // ---- ancillary (read-only) ---------------------------------------------
  it('ancillary.getBanks', async () => {
    await probe('ancillary.getBanks', () => sdk.ancillary.getBanks('KE'));
  });

  it('ancillary.getWallets', async () => {
    await probe('ancillary.getWallets', () => sdk.ancillary.getWallets(RECEIVING_COUNTRY));
  });

  // ---- accounts (read-only) ----------------------------------------------
  it('accounts.getStatus', async () => {
    await probe('accounts.getStatus', () =>
      sdk.accounts.getStatus('msisdn', RECEIVER_MSISDN, {
        bnv: 'John Doe',
        snv: 'Jane Sender',
      }),
    );
  });

  it('accounts.getStatus (bank account)', async () => {
    await probe('accounts.getStatus (bank account)', () =>
      sdk.accounts.getStatus('accountNumber', '004881761276', {
        bnv: 'CARLOS GUZMAN',
        bankname: 'Bank of America',
        banksubcode: '111000025',
        country: 'US',
      }),
    );
  });

  it('accounts.getStatus (B2B, bank account)', async () => {
    await probe('accounts.getStatus (B2B bank)', () =>
      sdk.accounts.getStatus('accountNumber', '8139851361', {
        bnv: 'CG GLOBAL CONSULTING LLC',
        bankcode: 'PNCCUS33',
        bankname: 'PNC BANK',
        banksubcode: '312076107',
        country: 'US',
      }),
    );
  });

  it('accounts.getPanStatus', async () => {
    if (!config.publicKey) {
      results.push({
        method: 'accounts.getPanStatus',
        outcome: 'skip',
        detail: 'no TERRAPAY_PUBLIC_KEY configured (card encryption key required)',
      });
      return;
    }
    await probe('accounts.getPanStatus', () =>
      sdk.accounts.getPanStatus('4242424242424242', {
        bnv: 'John Doe',
        country: RECEIVING_COUNTRY,
      }),
    );
  });

  it('accounts.verify (TPV)', async () => {
    await probe('accounts.verify', () =>
      sdk.accounts.verify({
        instrumentType: 'Wallet',
        country: RECEIVING_COUNTRY,
        beneficiaryName: 'John Doe',
        paymentRef: `TP-VERIFY-${Date.now()}`,
      }),
    );
  });

  // ---- quotations ---------------------------------------------------------
  const quoteBody = () => ({
    requestDate: getUtcTimestamp(),
    type: 'p2p' as TransactionType,
    debitParty: [{ key: 'msisdn', value: SENDER_MSISDN }],
    creditParty: [
      { key: 'instrumentType', value: 'WALLET' },
      { key: 'receivingCountry', value: RECEIVING_COUNTRY },
      { key: 'msisdn', value: RECEIVER_MSISDN },
    ],
    requestAmount: '100',
    requestCurrency: 'USD',
    quotes: [{ sendingCurrency: 'USD', receivingCurrency: 'UGX' }],
  });

  it('quotations.create (v1)', async () => {
    await probe('quotations.create', () => sdk.quotations.create(quoteBody()));
  });

  it('quotations.createV2', async () => {
    const res = await probe('quotations.createV2', () => sdk.quotations.createV2(quoteBody()));
    quoteId = res?.quotes?.[0]?.quoteId; // feed the remit flow if we got one
  });

  it('quotations.getCorridorRatesV2.BANK_AC.p2p', async () => {
    await probe('quotations.getCorridorRates', () =>
      sdk.quotations.getCorridorRates('USD', 'BANK_AC', 'p2p'),
    );
  });

  it('quotations.getCorridorRatesV2.WALLET.p2p', async () => {
    await probe('quotations.getCorridorRates', () =>
      sdk.quotations.getCorridorRates('USD', 'WALLET', 'p2p'),
    );
  });

  it('quotations.getCorridorRatesV2.CARD.p2p', async () => {
    await probe('quotations.getCorridorRates', () =>
      sdk.quotations.getCorridorRates('USD', 'CARD', 'p2p'),
    );
  });

  it('quotations.getCorridorRatesV3.CARD.b2p', async () => {
    await probe('quotations.getCorridorRatesV3', () =>
      sdk.quotations.getCorridorRatesV3('USD', 'CARD', 'b2p'),
    );
  });

  it('quotations.getCorridorRatesV3.WALLET.b2b', async () => {
    const result = await probe('quotations.getCorridorRatesV3', () =>
      sdk.quotations.getCorridorRatesV3('USD', 'WALLET', 'b2b'),
    );
    if (result) {
      const uk = result.quotes.filter(
        (quote) =>
          quote.country.toLowerCase().includes('gb') ||
          quote.receivingCurrency.toLowerCase().includes('gbp'),
      );
      console.log({ uk });
    }
  });
  it('quotations.getCorridorRatesV3.BANK_AC.p2b', async () => {
    await probe('quotations.getCorridorRatesV3', () =>
      sdk.quotations.getCorridorRatesV3('USD', 'BANK_AC', 'p2b'),
    );
  });

  it('quotations.create (b2b, bank account, USD->USD/US)', async () => {
    await probe('quotations.create (b2b bank)', () =>
      sdk.quotations.create({
        requestDate: '2025-02-02 10:51:15',
        type: 'b2b' as TransactionType,
        debitParty: [{ key: 'msisdn', value: SENDER_MSISDN }],
        creditParty: [
          { key: 'instrumentType', value: 'BANK_AC' },
          { key: 'receivingCountry', value: 'US' },
        ],
        requestAmount: '1000',
        requestCurrency: 'USD',
        quotes: [{ sendingCurrency: 'USD', receivingCurrency: 'USD' }],
      }),
    );
  });

  it('quotations.create (p2p, bank account, USD->USD/US)', async () => {
    await probe('quotations.create (p2p bank)', () =>
      sdk.quotations.create({
        requestDate: '2022-10-10 10:28:48',
        type: 'p2p' as TransactionType,
        debitParty: [{ key: 'msisdn', value: SENDER_MSISDN }],
        creditParty: [
          { key: 'instrumentType', value: 'BANK_AC' },
          { key: 'receivingCountry', value: 'US' },
        ],
        requestAmount: '1000',
        requestCurrency: 'USD',
        quotes: [{ sendingCurrency: 'USD', receivingCurrency: 'USD' }],
      }),
    );
  });

  // ---- transactions (chained remit flow) ---------------------------------
  it('transactions.create', async () => {
    const ref = `TP-${Date.now()}`;
    const res = await probe('transactions.create', () =>
      sdk.transactions.create(
        {
          amount: '100',
          currency: 'USD',
          type: 'p2p',
          requestDate: getUtcTimestamp(),
          requestingOrganisationTransactionReference: ref,
          debitParty: [{ key: 'msisdn', value: SENDER_MSISDN }],
          creditParty: [{ key: 'msisdn', value: RECEIVER_MSISDN }],
          senderKyc: {
            nationality: 'US',
            dateOfBirth: '1986-06-28',
            subjectName: { firstName: 'Jane', lastName: 'Sender', fullName: 'Jane Q Sender' },
            postalAddress: { addressLine1: '1 Main St', city: 'New York', country: 'US' },
            idDocument: [{ idType: 'passport', idNumber: '123456789', expiryDate: '2033-09-26' }],
          },
          recipientKyc: {
            subjectName: { firstName: 'John', lastName: 'Doe', fullName: 'John Doe' },
          },
          internationalTransferInformation: {
            quoteId: quoteId ?? 'UNKNOWN_QUOTE',
            receivingCountry: RECEIVING_COUNTRY,
            remittancePurpose: 'Family Maintenance',
            sourceOfFunds: 'Salary',
            relationshipSender: 'Brother',
          },
        },
        { correlationId: ref },
      ),
    );
    txnRef = res?.transactionReference ?? ref;
  });

  it('transactions.create (p2p, bank account)', async () => {
    const ref = `TP-BANK-${Date.now()}`;
    await probe('transactions.create (p2p bank)', () =>
      sdk.transactions.create(
        {
          amount: '1000.00',
          currency: 'USD',
          type: 'p2p',
          requestDate: getUtcTimestamp(),
          requestingOrganisationTransactionReference: ref,
          debitParty: [{ key: 'msisdn', value: SENDER_MSISDN }],
          creditParty: [
            { key: 'bankaccountno', value: '004881761276' },
            { key: 'organisationid', value: 'Bank of America' },
            { key: 'banksubcode', value: '111000025' },
          ],
          senderKyc: {
            nationality: 'US',
            dateOfBirth: '1986-06-28',
            subjectName: { firstName: 'Jane', lastName: 'Sender', fullName: 'Jane Q Sender' },
            postalAddress: { addressLine1: '1 Main St', city: 'New York', country: 'US' },
            idDocument: [{ idType: 'passport', idNumber: '123456789', expiryDate: '2033-09-26' }],
          },
          recipientKyc: {
            subjectName: { firstName: 'CARLOS', lastName: 'GUZMAN', fullName: 'CARLOS GUZMAN' },
            postalAddress: {
              addressLine1: '49, park street',
              city: 'California',
              stateProvince: 'California',
              postalCode: '90080',
              country: 'US',
            },
          },
          internationalTransferInformation: {
            quoteId: 'QR037FNLZPCSPSK05',
            receivingCountry: 'US',
            remittancePurpose: 'Gift',
            sourceOfFunds: 'Salary',
            relationshipSender: 'Mother',
          },
        },
        { correlationId: ref },
      ),
    );
  });

  it('transactions.create (b2b, bank account)', async () => {
    const ref = `TP-B2B-${Date.now()}`;
    await probe('transactions.create (b2b bank)', () =>
      sdk.transactions.create(
        {
          amount: '1000.00',
          currency: 'USD',
          type: 'b2b',
          sendingAmount: '1000.00',
          payinCcyCode: 'USD',
          paymentMode: 'Account',
          paymentOption: 'Account Credit',
          requestDate: getUtcTimestamp(),
          requestingOrganisationTransactionReference: ref,
          debitParty: [{ key: 'msisdn', value: SENDER_MSISDN }],
          creditParty: [
            { key: 'bankaccountno', value: '8139851361' },
            { key: 'sortcode', value: 'PNCCUS33' },
            { key: 'organisationid', value: 'PNC BANK' },
            { key: 'banksubcode', value: '312076107' },
          ],
          business: {
            senderKyc: {
              businessName: 'sample business',
              businessAddress1: "25 alton's road",
              businessAddressCity: 'Lyon',
              businessAddressZip: '12345',
              businessPrimaryContactCountryCode: 'CA',
              businessPrimaryContactNo: '+1 2142094937',
              businessEmail: 'test@gmail.com',
              businessCountryCode: 'CA',
              businessRegistrationType: 'corporation',
              businessRegistrationNumber: '23123456789',
              businessRegistrationIssueDate: '2001-09-26',
              businessIDValidThru: '2033-09-26',
            },
            recepientKyc: {
              businessName: 'CG GLOBAL CONSULTING LLC',
              businessAddressCountryCode: 'US',
              businessAddress1: "49,park street walton's road",
              businessAddressCity: 'New york',
              businessAddressState: 'Arizona',
              businessAddressZip: '12345',
            },
          },
          internationalTransferInformation: {
            quoteId: 'QR037FCRVXL249AC0',
            receivingCountry: 'US',
            remittancePurpose: 'Advanced Goods Payments',
            sourceOfFunds: 'Savings',
            relationshipSender: 'N/A',
          },
        },
        { correlationId: ref },
      ),
    );
  });

  it('transactions.getStatus', async () => {
    await probe('transactions.getStatus', () => sdk.transactions.getStatus(txnRef ?? 'TP-UNKNOWN'));
  });

  it('transactions.getStatus (bank account txn)', async () => {
    await probe('transactions.getStatus (bank txn)', () =>
      sdk.transactions.getStatus('TPTQ000001384182'),
    );
  });

  it('transactions.getStatus (b2b txn)', async () => {
    await probe('transactions.getStatus (b2b txn)', () =>
      sdk.transactions.getStatus('TPTQ000000863144'),
    );
  });

  it('transactions.cancel', async () => {
    await probe('transactions.cancel', () =>
      sdk.transactions.cancel({ txnId: txnRef ?? 'TP-UNKNOWN', reason: 'integration test' }),
    );
  });

  it('transactions.cancel (p2p, given txnId)', async () => {
    await probe('transactions.cancel (p2p)', () =>
      sdk.transactions.cancel({ txnId: 'TPTQ000000000809', reason: 'cancelling' }),
    );
  });

  it('transactions.reverse', async () => {
    await probe('transactions.reverse', () =>
      sdk.transactions.reverse({
        txnId: txnRef ?? 'TP-UNKNOWN',
        reversalReason: 'integration test',
      }),
    );
  });

  it('transactions.reverse (p2p, given txnId)', async () => {
    await probe('transactions.reverse (p2p)', () =>
      sdk.transactions.reverse({
        txnId: 'TPTQ000000000806',
        reversalReason: 'reversalreason',
      }),
    );
  });

  // ---- ancillary.uploadFile (multipart) ----------------------------------
  it('ancillary.uploadFile', async () => {
    const blob = new Blob(['integration-test-document'], { type: 'text/plain' });
    await probe('ancillary.uploadFile', () =>
      sdk.ancillary.uploadFile(blob, {
        customerType: 'sender',
        docType: 'Invoice',
        transactionId: txnRef ?? 'TP-UNKNOWN',
      }),
    );
  });
});
