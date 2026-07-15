import { describe, expect, it, mock } from 'bun:test';
import { generateKeyPairSync } from 'node:crypto';
import { TerraPay } from '../terrapay.js';
import {
  NAME_MATCH_STATUSES,
  SCHEMES,
  describeProviderRequirement,
  getBusinessSide,
} from '../types/index.js';
import type {
  BusinessKyc,
  NameMatchStatus,
  RecipientKyc,
  SenderKyc,
  TransactionRequest,
} from '../types/index.js';

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
    expect(url).toContain('/gsma/accounts/232201001617/status?');
    expect(url).not.toContain('/gsma/accounts/accountNumber/');
    expect(url).toContain('bnv=Devki%20Luggage%20Centre');
    expect(url).toContain('bankcode=CNRB0000232');
    expect(url).toContain('bankname=Canara%20Bank');
    expect(url).toContain('country=IN');
    expect(url).toContain('banksubcode=BR001');
    expect(url).toContain('accounttype=Savings');
  });

  it('getStatus: bank account without IFSC bankcode (US, banksubcode routing number)', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.accounts.getStatus('accountNumber', '004881761276', {
      bnv: 'CARLOS GUZMAN',
      bankname: 'Bank of America',
      banksubcode: '111000025',
      country: 'US',
    });
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/004881761276/status?');
    expect(url).not.toContain('/gsma/accounts/accountNumber/');
    expect(url).toContain('bnv=CARLOS%20GUZMAN');
    expect(url).toContain('bankname=Bank%20of%20America');
    expect(url).toContain('banksubcode=111000025');
    expect(url).toContain('country=US');
    expect(url).not.toContain('bankcode=');
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

  it('Quotations: getCorridorRates accepts a business TransactionType', async () => {
    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            requestDate: '2020-01-02 10:51:16',
            requestCurrency: 'USD',
            quotes: [],
          }),
          { status: 200 },
        ),
      ),
    );
    await sdk.quotations.getCorridorRates('USD', 'BANK_AC', 'b2b');
    const [url] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('transactionType=b2b');
  });

  it('Quotations: getCorridorRates rejects a non-TransactionType string at compile time', () => {
    // @ts-expect-error 'b2c' is not a valid TransactionType
    const call = () => sdk.quotations.getCorridorRates('USD', 'BANK_AC', 'b2c');
    expect(typeof call).toBe('function');
  });

  it('Quotations: getCorridorRates parses the corridor rate shape', async () => {
    const body = {
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
    };
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));
    const res = await sdk.quotations.getCorridorRates('USD', 'BANK_AC');
    expect(res.requestCurrency).toBe('USD');
    expect(res.quotes[0].receivingCurrency).toBe('ILS');
    expect(res.quotes[0].fxRate).toBe('3.590000');
    expect(res.quotationStatus).toBe('9000:Success');
  });

  it('Quotations: getCorridorRatesV3 parses the corridor rate shape', async () => {
    const body = {
      requestDate: '2017-10-18 09:27:16',
      requestCurrency: 'USD',
      quotes: [
        {
          receivingCurrency: 'CNY',
          fxRate: '7.8',
          transactionType: 'p2p',
          instrumentType: 'BANK_AC',
          scheme: 'UP',
          country: 'CN',
          verticalTypes: '*',
        },
      ],
      quotationStatus: '9000:Success',
    };
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response(JSON.stringify(body), { status: 200 })));
    const res = await sdk.quotations.getCorridorRatesV3('USD', 'BANK_AC');
    expect(res.requestCurrency).toBe('USD');
    expect(res.quotes[0].receivingCurrency).toBe('CNY');
    expect(res.quotes[0].fxRate).toBe('7.8');
    expect(res.quotes[0].country).toBe('CN');
    expect(res.quotes[0].verticalTypes).toBe('*');
    expect(res.quotationStatus).toBe('9000:Success');
  });

  it('Reports: getLedgerBalance', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.reports.getLedgerBalance();
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/all/balance_v1');
    expect(init.method).toBe('GET');
  });

  it('Reports: getLedgerBalance normalizes an empty-object response to []', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    const balances = await sdk.reports.getLedgerBalance();
    expect(balances).toEqual([]);
  });

  it('Reports: getLedgerBalance passes through an array response unchanged', async () => {
    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify([
            { currency: 'USD', currentBalance: '100.00', account: 'ACC1', status: 'ACTIVE' },
          ]),
          { status: 200 },
        ),
      ),
    );
    const balances = await sdk.reports.getLedgerBalance();
    expect(balances).toEqual([
      { currency: 'USD', currentBalance: '100.00', account: 'ACC1', status: 'ACTIVE' },
    ]);
  });

  it('Reports: getLedgerBalanceByCurrency', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    await sdk.reports.getLedgerBalanceByCurrency('USD');
    const [url, init] = (global.fetch as any).mock.calls[0];
    expect(url).toContain('/gsma/accounts/USD/balance_v1');
    expect(init.method).toBe('GET');
  });

  it('Reports: getLedgerBalanceByCurrency normalizes an empty-object response to []', async () => {
    // @ts-expect-error
    global.fetch = mock(() => Promise.resolve(new Response('{}', { status: 200 })));
    const balances = await sdk.reports.getLedgerBalanceByCurrency('USD');
    expect(balances).toEqual([]);
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

  it('Transactions: create derives status from transactionStatus when the API omits it', async () => {
    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            amount: '1000.00',
            currency: 'USD',
            type: 'p2p',
            requestDate: '2026-07-08 15:55:32',
            requestingOrganisationTransactionReference: 'TP-BANK-1',
            transactionStatus: '3050:Remit Acknowledged.',
            transactionReference: 'TPMU000001951126',
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await sdk.transactions.create({} as any);
    expect(res.status).toBe('PENDING');
  });

  it('Transactions: create keeps an API-provided status untouched', async () => {
    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(
          JSON.stringify({
            transactionStatus: '3000:Remit Success',
            transactionReference: 'TPMU000001951127',
            status: 'CANCELLED',
          }),
          { status: 200 },
        ),
      ),
    );
    const res = await sdk.transactions.create({} as any);
    expect(res.status).toBe('CANCELLED');
  });

  it('Transactions: getStatus derives status from transactionStatus', async () => {
    // @ts-expect-error
    global.fetch = mock(() =>
      Promise.resolve(
        new Response(JSON.stringify({ transactionStatus: '3000:Remit Success' }), { status: 200 }),
      ),
    );
    const res = await sdk.transactions.getStatus('TP123');
    expect(res.status).toBe('SUCCESS');
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
      recipientKyc: {
        subjectName: { firstName: 'John', lastName: 'Doe', fullName: 'John Doe' },
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

  it('describeProviderRequirement: flags only the confirmed corridors', () => {
    expect(describeProviderRequirement('CO')).toBe('mandatory');
    expect(describeProviderRequirement('eg')).toBe('mandatory');
    expect(describeProviderRequirement('US')).toBe('unknown');
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

  describe('TransactionRequest variants', () => {
    const baseFields = {
      amount: '100',
      currency: 'USD',
      requestDate: '2021-05-23 08:19:36',
      requestingOrganisationTransactionReference: 'TxnRef001',
      debitParty: [{ key: 'msisdn', value: '+10000000000' }],
      creditParty: [{ key: 'msisdn', value: '+20000000000' }],
    };

    const personalSenderKyc: SenderKyc = {
      nationality: 'US',
      dateOfBirth: '1990-01-01',
      subjectName: { firstName: 'Jane', lastName: 'Sender', fullName: 'Jane Sender' },
      postalAddress: { addressLine1: '1 Main St', city: 'New York', country: 'US' },
      idDocument: [{ idType: 'passport', idNumber: '123456789', expiryDate: '2033-01-01' }],
    };

    const personalRecipientKyc: RecipientKyc = {
      subjectName: { firstName: 'John', lastName: 'Doe', fullName: 'John Doe' },
    };

    const businessKyc: BusinessKyc = { businessName: 'Acme Corp' };

    it('p2p requires both senderKyc and recipientKyc', () => {
      const valid: TransactionRequest = {
        ...baseFields,
        type: 'p2p',
        senderKyc: personalSenderKyc,
        recipientKyc: personalRecipientKyc,
      };
      expect(valid.type).toBe('p2p');

      // @ts-expect-error senderKyc is required for p2p
      const missingSender: TransactionRequest = {
        ...baseFields,
        type: 'p2p',
        recipientKyc: personalRecipientKyc,
      };
      expect(missingSender.type).toBe('p2p');
    });

    it('b2b requires business.senderKyc and business.recepientKyc', () => {
      const valid: TransactionRequest = {
        ...baseFields,
        type: 'b2b',
        paymentMode: 'Account',
        paymentOption: 'Account Credit',
        business: { senderKyc: businessKyc, recepientKyc: businessKyc },
      };
      expect(valid.type).toBe('b2b');

      const missingRecipient: TransactionRequest = {
        ...baseFields,
        type: 'b2b',
        paymentMode: 'Account',
        paymentOption: 'Account Credit',
        // @ts-expect-error business.recepientKyc is required for b2b
        business: { senderKyc: businessKyc },
      };
      expect(missingRecipient.type).toBe('b2b');
    });

    it('b2p requires business.senderKyc plus a personal recipientKyc', () => {
      const valid: TransactionRequest = {
        ...baseFields,
        type: 'b2p',
        paymentMode: 'Account',
        paymentOption: 'Account Credit',
        business: { senderKyc: businessKyc },
        recipientKyc: personalRecipientKyc,
      };
      expect(valid.type).toBe('b2p');

      // @ts-expect-error recipientKyc is required for b2p
      const missingRecipient: TransactionRequest = {
        ...baseFields,
        type: 'b2p',
        paymentMode: 'Account',
        paymentOption: 'Account Credit',
        business: { senderKyc: businessKyc },
      };
      expect(missingRecipient.type).toBe('b2p');
    });

    it('p2b requires a personal senderKyc plus business.recepientKyc', () => {
      const valid: TransactionRequest = {
        ...baseFields,
        type: 'p2b',
        paymentMode: 'Account',
        paymentOption: 'Account Credit',
        senderKyc: personalSenderKyc,
        business: { recepientKyc: businessKyc },
      };
      expect(valid.type).toBe('p2b');

      // @ts-expect-error senderKyc is required for p2b
      const missingSender: TransactionRequest = {
        ...baseFields,
        type: 'p2b',
        paymentMode: 'Account',
        paymentOption: 'Account Credit',
        business: { recepientKyc: businessKyc },
      };
      expect(missingSender.type).toBe('p2b');
    });

    it('business types require paymentMode and paymentOption', () => {
      // @ts-expect-error paymentMode/paymentOption are required for b2b
      const missingPayment: TransactionRequest = {
        ...baseFields,
        type: 'b2b',
        business: { senderKyc: businessKyc, recepientKyc: businessKyc },
      };
      expect(missingPayment.type).toBe('b2b');
    });

    it('getBusinessSide maps each TransactionType to its business side', () => {
      expect(getBusinessSide('p2p')).toBe('none');
      expect(getBusinessSide('b2b')).toBe('both');
      expect(getBusinessSide('b2p')).toBe('sender');
      expect(getBusinessSide('p2b')).toBe('recipient');
    });
  });
});
