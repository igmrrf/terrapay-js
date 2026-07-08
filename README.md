# terrapay-js

*Disclaimer: Not an official product of TerraPay. Built following official API documentation.*
A production-grade, type-safe SDK for the TerraPay API, built for high-performance environments.

This SDK provides a robust, environment-agnostic, and fully-typed interface to TerraPay's Remittance, Quotation, Verification, and Ancillary APIs. It adheres to the highest engineering standards, including built-in exponential backoff, circuit breaking, and native Bun support.

## 🚀 Features

- **Strict Type Safety**: Written in TypeScript with exhaustive interfaces for every request, response, and error.
- **Resilience**: Built-in exponential backoff with jitter for handling rate limits (`429`) and server errors (`5xx`).
- **Native Bun Support**: Optimized for Bun's high-speed runtime and test runner.
- **Environment Agnostic**: Uses native `fetch` (Node 20+, Edge, Cloudflare Workers).
- **Dual Mode**: Ships with both ESM and CommonJS exports.
- **Built-in Crypto**: Automatically handles `X-PASSWORD` SHA-256 hashing and RSA-OAEP PAN encryption.

## 📦 Installation

```bash
bun add terrapay-js
# or
npm install terrapay-js
```

## 🛠 Usage

### Initialization

```typescript
import { TerraPay } from 'terrapay-js';

const sdk = new TerraPay({
  username: 'your_username',
  password: 'your_password', // Plaintext; SDK will automatically SHA-256 hash it
  isPasswordHashed: false,
  originCountry: 'CA',
  environment: 'uat', // or 'production'
  maxRetries: 3,
});
```

### 1. Remit to Mobile (Wallet)

```typescript
const status = await sdk.accounts.getStatus('msisdn', '+1234567890', { bnv: 'John Doe' });

const quote = await sdk.quotations.createV2({
  requestDate: new Date().toISOString().replace(/T/, ' ').replace(/\..+/, ''),
  type: 'p2p',
  debitParty: [{ key: 'msisdn', value: '+1234567890' }],
  creditParty: [
    { key: 'instrumentType', value: 'WALLET' },
    { key: 'receivingCountry', value: 'UG' },
    { key: 'msisdn', value: '+256897378380' }
  ],
  requestAmount: '100',
  requestCurrency: 'USD',
  quotes: [{ sendingCurrency: 'USD', receivingCurrency: 'UGX' }]
});

const remit = await sdk.transactions.create({
  // ... parameters
  creditParty: [{ key: 'msisdn', value: '+256897378380' }],
  internationalTransferInformation: {
    quoteId: quote.quotes[0].quoteId,
    receivingCountry: 'UG',
    remittancePurpose: 'Family Maintenance',
    sourceOfFunds: 'Salary'
  }
});
```

### 2. Remit to Bank

```typescript
// 1. Find the correct bank codes
const { banks } = await sdk.ancillary.getBanks('KE');

// 2. Execute transaction
const remit = await sdk.transactions.create({
  // ... parameters
  creditParty: [
    { key: 'bankaccountno', value: '123456789' },
    { key: 'sortcode', value: 'IFSC12345' },
    { key: 'organisationid', value: 'KCB Bank' }
  ],
  // ...
});
```

### 3. Remit to Card (PAN Encryption)

TerraPay requires PANs to be RSA encrypted using their public key.

```typescript
import { encryptPAN } from 'terrapay-js';

const publicKey = `-----BEGIN PUBLIC KEY-----\n...\n-----END PUBLIC KEY-----`;
const encryptedPan = encryptPAN('4111222233334444', publicKey);

const remit = await sdk.transactions.create({
  // ... parameters
  creditParty: [
    { key: 'pan', value: encryptedPan },
    { key: 'instrumentType', value: 'CARD' }
  ],
  // ...
});
```

## 🧪 Testing with Mock SDK

We export a `MockTerraPay` class to let you test your application logic without making network calls.

```typescript
import { MockTerraPay } from 'terrapay-js';

const mockSdk = new MockTerraPay();

// Returns a pre-defined static structure
const mockData = MockTerraPay.createDefaultResponses().accountStatus;

// Use it in your tests (e.g., bun test)
test('my service handles available accounts', async () => {
  const status = await mockSdk.accounts.getStatus('msisdn', '+123', { bnv: 'John Doe' });
  expect(status.status).toBe('available');
});
```

## ⚠️ Error Handling

All errors thrown by the SDK inherit from `TerraPayError`. You can access the HTTP status code, API error codes, and the raw error response.

```typescript
import { 
  TerraPayError, 
  RateLimitError, 
  AuthenticationError,
  ValidationError 
} from 'terrapay-js';

try {
  await sdk.reports.getLedgerBalance();
} catch (error) {
  if (error instanceof ValidationError) {
    console.log(error.status); // 400
    console.log(error.errorCode); // e.g., 'invalidParameter'
    console.log(error.message); // Human readable description from API
    console.log(error.rawError); // Complete JSON response body
  } else if (error instanceof RateLimitError) {
    // Handle 429
  } else if (error instanceof AuthenticationError) {
    // Handle 401/403
  } else if (error instanceof TerraPayError) {
    // Generic API error (e.g., 500)
  }
}
```

## 📦 Response Types

The SDK provides fully-typed responses for all API calls, ensuring you have autocompletion and type safety for every field.

### Transaction Response
When creating or checking the status of a transaction:
```typescript
interface TransactionResponse {
  transactionReference: string; // TerraPay's unique ID
  transactionStatus: string;    // e.g., 'SUCCESS', 'PENDING'
  amount: string;
  currency: string;
  // ... other fields
}
```

### Account Status
```typescript
interface AccountStatusResponse {
  status: 'available' | 'unavailable' | 'unregistered';
  subStatus?: string;
}
```

### Quotation Response
```typescript
interface QuotationResponse {
  quotes: Array<{
    quoteId: string;
    fxRate: string;
    sendingAmount: string;
    receivingAmount: string;
    // ...
  }>;
}
```

## 🔢 Response Codes & Enums

The SDK exports enums for all TerraPay API response codes, allowing you to perform type-safe checks on results.

```typescript
import { RemitResponseCode, BeneficiaryValidationResponseCode } from 'terrapay-js';

const remit = await sdk.transactions.create({ ... });

if (remit.transactionStatus === RemitResponseCode.REMIT_SUCCESS) {
  // Handle success (code '3000')
} else if (remit.transactionStatus === RemitResponseCode.REMIT_ACKNOWLEDGED_STATUS_PENDING) {
  // Handle pending (code '3050')
}
```

Available Enums:
- `RemitResponseCode`: Statuses for remittance execution.
- `QuoteResponseCode`: Statuses for FX rate requests.
- `BeneficiaryValidationResponseCode`: Statuses for account verification.
- `GeneralResponseCode`: General routing and validation errors.

## 🤝 Community & Legal

- **Contributing**: Please read our [Contributing Guide](CONTRIBUTING.md) for details on our code of conduct and the process for submitting pull requests.
- **Code of Conduct**: This project adheres to the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md).
- **Security**: If you find a security vulnerability, please follow our [Security Policy](SECURITY.md).
- **License**: This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🏗 Development

```bash
bun install
bun run build
bun test
bun run lint
```

---
