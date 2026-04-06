# @streampay/sdk

Public SDK for interacting with StreamPay payment streams on Stacks.

## Purpose

This package provides a TypeScript/JavaScript SDK for:

- **Stream Creation**: Create recurring payment streams
- **Payment Claims**: Claim accrued payments from streams
- **Stream Management**: Cancel, pause, resume streams
- **Query Streams**: Fetch stream data and history

## Installation

```bash
npm install @streampay/sdk
# or
yarn add @streampay/sdk
# or
pnpm add @streampay/sdk
```

## Usage

```typescript
import { StreamPayClient } from '@streampay/sdk';

// Initialize client
const client = new StreamPayClient({
  network: 'mainnet', // or 'testnet'
});

// Create a stream
const stream = await client.createStream({
  recipient: 'SP2...',
  amount: 1000000n, // 1 STX in microSTX
  interval: 86400,  // Daily payments
  duration: 2592000, // 30 days
});

// Claim payments
const claim = await client.claimPayment(streamId);
```

## Package Exports

This package supports both ESM and CommonJS:

```typescript
// ESM
import { StreamPayClient } from '@streampay/sdk';

// CommonJS
const { StreamPayClient } = require('@streampay/sdk');
```

## Scripts

```bash
npm run build      # Build ESM, CJS, and types
npm run dev        # Watch mode for development
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
npm run test       # Run tests
```

## TODO

- [ ] Implement StreamPayClient
- [ ] Add contract call wrappers
- [ ] Add query functions
- [ ] Write comprehensive tests
- [ ] Add usage documentation
