import { describe, expect, it, mock } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import { TerraPay } from '../terrapay.js';
import type { TransactionRequest } from '../types/index.js';

describe('Domain Resources API Methods', () => {
  const sdk = new TerraPay({
    username: 'test',
    password: 'password',
    originCountry: 'US',
    environment: 'uat',
  });

  const { publicKey } = generateKeyPairSync('rsa', {
    modulusLength: 2048,
    publicKeyEncoding: { type: 'spki', format: 'pem' },
    privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
  });

  it('Accounts: verify', async () => {
    // @ts-expect-error Mocking global fetch for testing
    global.fetch = mock(() =>
      Promise.resolve(new Response(JSON.stringify({ status: 'success' }), { status: 200 })),
    );

    await sdk.accounts.verify({} as any);
    expect(global.fetch).toHaveBeenCalled();
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/tpverify/api/v1/verify');
    expect(init.method).toBe('POST');
  });

  it('should URL encode path parameters correctly', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.accounts.getStatus('msisdn', '+12 34', 'A & B');
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/msisdn/%2B12%2034/status?bnv=A%20%26%20B');
  });

  it('Ancillary: getBanks', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.ancillary.getBanks('KE');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/getbanklist/KE');
    expect(init.method).toBe('GET');
  });

  it('Ancillary: getWallets', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.ancillary.getWallets('KE');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/getwalletlist/KE');
    expect(init.method).toBe('GET');
  });

  it('Quotations: create', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.quotations.create({} as any);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/quotations');
    expect(init.method).toBe('POST');
  });

  it('Quotations: createV2', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.quotations.createV2({} as any);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsmaV2/quotations');
    expect(init.method).toBe('POST');
  });

  it('Quotations: getCorridorRates', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.quotations.getCorridorRates('USD', 'WALLET', 'p2p');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsmaV2/quotations/USD?instrumentType=WALLET&transactionType=p2p');
    expect(init.method).toBe('GET');
  });

  it('Quotations: getCorridorRatesV3', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.quotations.getCorridorRatesV3('USD', 'BANK_AC', 'p2p');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsmaV3/quotations/USD?instrumentType=BANK_AC&transactionType=p2p');
    expect(init.method).toBe('GET');
  });

  it('Quotations: getCorridorRatesV3 defaults transactionType to p2p', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.quotations.getCorridorRatesV3('USD', 'CARD');
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsmaV3/quotations/USD?instrumentType=CARD&transactionType=p2p');
  });

  it('Reports: getLedgerBalance', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.reports.getLedgerBalance();
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/all/balance_v1');
    expect(init.method).toBe('GET');
  });

  it('Reports: getLedgerBalanceByCurrency', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.reports.getLedgerBalanceByCurrency('USD');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/USD/balance_v1');
    expect(init.method).toBe('GET');
  });

  it('Reports: getStatements', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.reports.getStatements('2020', '2021', 'book');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(
      '/PartnerPortalReports/partnerstatements_v1?start=2020&end=2021&ledgerBookName=book',
    );
    expect(init.method).toBe('GET');
  });

  it('Transactions: create', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.transactions.create({} as any, { correlationId: 'abc' });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/transactions');
    expect(init.method).toBe('POST');
    expect(init.headers['X-Correlation-ID']).toBe('abc');
  });

  it('Transactions: create serializes scheme and senderKyc.cityOfBirth', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    const body: TransactionRequest = {
      amount: '500',
      currency: 'NPR',
      type: 'p2p',
      scheme: '',
      requestDate: '2021-05-23 08:19:36',
      requestingOrganisationTransactionReference: 'SrcTxnId001',
      debitParty: [{ key: 'msisdn', value: '+971810456234' }],
      creditParty: [{ key: 'msisdn', value: '+9779840002320' }],
      senderKyc: { cityOfBirth: 'Paris' },
    };
    await sdk.transactions.create(body);
    const [, init] = (global.fetch as any).mock.calls[0];
    const sent = JSON.parse(init.body);
    expect(sent.scheme).toBe('');
    expect(sent.senderKyc.cityOfBirth).toBe('Paris');
  });

  it('Transactions: getStatus', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.transactions.getStatus('123');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/transactions_v3/123');
    expect(init.method).toBe('GET');
  });

  it('Transactions: cancel', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.transactions.cancel({} as any);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/remitCancel');
    expect(init.method).toBe('POST');
  });

  it('Transactions: reverse', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.transactions.reverse({} as any);
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/reversalInitiate');
    expect(init.method).toBe('POST');
  });

  it('Accounts: getPanStatus encrypts the PAN into the X-PAN header', async () => {
    const panSdk = new TerraPay({
      username: 'test',
      password: 'password',
      originCountry: 'US',
      environment: 'uat',
      publicKey,
    });
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await panSdk.accounts.getPanStatus('4111222233334444', 'MAGALI DOLORES ORTIZ', 'PH');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/pan/status?bnv=MAGALI%20DOLORES%20ORTIZ&country=PH');
    expect(init.method).toBe('GET');
    expect(typeof init.headers['X-PAN']).toBe('string');
    expect(init.headers['X-PAN'].length).toBeGreaterThan(0);
  });

  it('Accounts: getPanStatus throws when publicKey is not configured', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await expect(sdk.accounts.getPanStatus('4111', 'Name', 'PH')).rejects.toThrow(
      '`publicKey` is required',
    );
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('Ancillary: uploadFile sends multipart FormData without a JSON Content-Type', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    const file = new Blob(['dummy content'], { type: 'text/plain' });
    await sdk.ancillary.uploadFile(file, {
      customerType: 'sender',
      docType: 'Invoice',
      transactionId: 'TPR8000001806581',
    });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain(
      '/fileUpload?customerType=sender&docType=Invoice&transactionId=TPR8000001806581',
    );
    expect(init.method).toBe('POST');
    expect(init.body).toBeInstanceOf(FormData);
    expect(init.headers['Content-Type']).toBeUndefined();
  });
});
