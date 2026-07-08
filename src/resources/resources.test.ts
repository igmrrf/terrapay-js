import { describe, expect, it, mock } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import { TerraPay } from '../terrapay.js';
import { NAME_MATCH_STATUSES, SCHEMES } from '../types/index.js';
import type { NameMatchStatus, TransactionRequest } from '../types/index.js';

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
    // TPV lives on a different host/port than the core API, and has no /eig prefix.
    expect(url).toBe('https://uat-tpverify.terrapay.com:20201/tpverify/api/v1/verify');
    expect(init.method).toBe('POST');
  });

  it('Accounts: verify honors a custom tpVerifyBaseUrl', async () => {
    const tpvSdk = new TerraPay({
      username: 'test',
      password: 'password',
      originCountry: 'US',
      environment: 'uat',
      tpVerifyBaseUrl: 'https://custom-tpv.example.com',
    });
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await tpvSdk.accounts.verify({} as any);
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toBe('https://custom-tpv.example.com/tpverify/api/v1/verify');
  });

  it('should URL encode path parameters correctly', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.accounts.getStatus('msisdn', '+12 34', { bnv: 'A & B' });
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/msisdn/%2B12%2034/status?bnv=A%20%26%20B');
  });

  it('getStatus: builds wallet query params (bnv, snv, provider)', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.accounts.getStatus('msisdn', '+123', {
      bnv: 'John Smith',
      snv: 'David Robinson',
      provider: 'CO_BREB_PAY',
    });
    const [url] = (global.fetch as any).mock.calls[0];
    // Order follows the documented parameter order (bnv, ..., provider, snv, ...).
    expect(url).toContain(
      '/gsma/accounts/msisdn/%2B123/status?bnv=John%20Smith&provider=CO_BREB_PAY&snv=David%20Robinson',
    );
  });

  it('getStatus: builds bank-account query params', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.accounts.getStatus('accountNumber', '232201001617', {
      bnv: 'Devki Luggage Centre',
      bankname: 'Canara Bank',
      country: 'IN',
      bankcode: 'CNRB0000232',
      banksubcode: 'BR001',
      accounttype: 'Savings',
    });
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/accountNumber/232201001617/status?');
    expect(url).toContain('bnv=Devki%20Luggage%20Centre');
    expect(url).toContain('bankcode=CNRB0000232');
    expect(url).toContain('bankname=Canara%20Bank');
    expect(url).toContain('country=IN');
    expect(url).toContain('banksubcode=BR001');
    expect(url).toContain('accounttype=Savings');
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

  it('Quotations: getCorridorRates parses the corridor rate shape', async () => {
    const body = [
      {
        requestDate: '2020-01-02 10:51:16',
        requestCurrency: 'USD',
        quotes: [
          {
            receivingCurrency: 'ILS',
            fxRate: '3.590000',
            transactionType: 'p2p',
            instrumentType: 'BANK_AC',
            scheme: '*',
          },
        ],
        quotationStatus: '9000:Success',
      },
    ];
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));
    const res = await sdk.quotations.getCorridorRates('USD', 'BANK_AC');
    expect(res[0].requestCurrency).toBe('USD');
    expect(res[0].quotes[0].receivingCurrency).toBe('ILS');
    expect(res[0].quotes[0].fxRate).toBe('3.590000');
    expect(res[0].quotationStatus).toBe('9000:Success');
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
      senderKyc: {
        nationality: 'FR',
        dateOfBirth: '1986-06-28',
        cityOfBirth: 'Paris',
        subjectName: { firstName: 'Einstein', lastName: 'Bela', fullName: 'Einstein James Bela' },
        postalAddress: { addressLine1: '49', city: 'Lyon', country: 'FR' },
        idDocument: [{ idType: 'passport', idNumber: '123456789', expiryDate: '2033-09-26' }],
      },
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

  it('SCHEMES: exports the full country-specific scheme table', () => {
    expect(SCHEMES).toHaveLength(14);
    const codes = SCHEMES.map((s) => s.scheme);
    expect(codes).toContain('MC');
    expect(codes).toContain('INSTANT');
    // Every entry has a valid instrument type
    for (const s of SCHEMES) {
      expect(['WALLET', 'BANK_AC', 'CARD']).toContain(s.instrumentType);
    }
    expect(SCHEMES.find((s) => s.scheme === 'NEQUI')?.instrumentType).toBe('WALLET');
  });

  it('NAME_MATCH_STATUSES: exposes all four match codes with categories', () => {
    const codes: NameMatchStatus[] = ['MTCH', 'CMTC', 'NMTC', 'NOAP'];
    expect(Object.keys(NAME_MATCH_STATUSES)).toEqual(codes);
    expect(NAME_MATCH_STATUSES.MTCH.category).toBe('Success');
    expect(NAME_MATCH_STATUSES.CMTC.category).toBe('Success');
    expect(NAME_MATCH_STATUSES.NOAP.category).toBe('Success');
    expect(NAME_MATCH_STATUSES.NMTC.category).toBe('Verification Failed');
    expect(NAME_MATCH_STATUSES.MTCH.definition).toContain('exact match');
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
    await panSdk.accounts.getPanStatus('4111222233334444', {
      bnv: 'MAGALI DOLORES ORTIZ',
      country: 'PH',
    });
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/pan/status?bnv=MAGALI%20DOLORES%20ORTIZ&country=PH');
    expect(init.method).toBe('GET');
    expect(typeof init.headers['X-PAN']).toBe('string');
    expect(init.headers['X-PAN'].length).toBeGreaterThan(0);
  });

  it('Accounts: getPanStatus throws when publicKey is not configured', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await expect(sdk.accounts.getPanStatus('4111', { bnv: 'Name', country: 'PH' })).rejects.toThrow(
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
