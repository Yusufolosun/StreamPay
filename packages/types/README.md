# @streampay/types

Shared TypeScript types for the StreamPay monorepo.

## Purpose

This package provides shared type definitions used across:

- `@streampay/sdk` - Public SDK
- `@streampay/web` - Frontend application
- `@streampay/api` - Backend API

## Installation

```bash
npm install @streampay/types
```

## Usage

```typescript
import type { Stream, StreamStatus, StreamConfig } from '@streampay/types';

const stream: Stream = {
  id: '1',
  sender: 'SP1...',
  recipient: 'SP2...',
  amount: 1000000n,
  interval: 86400,
  startTime: Date.now(),
  status: 'active',
};
```

## Type Categories

### Core Types

- `Stream` - Payment stream data structure
- `StreamConfig` - Configuration for creating streams
- `StreamStatus` - Stream state enum
- `PaymentClaim` - Claim transaction data

### API Types

- `ApiResponse<T>` - Generic API response wrapper
- `PaginatedResponse<T>` - Paginated list response
- `ErrorResponse` - API error format

### Contract Types

- `ContractCallOptions` - Options for contract calls
- `TransactionResult` - Blockchain transaction result

## Scripts

```bash
npm run build      # Build type definitions
npm run dev        # Watch mode
npm run typecheck  # Type checking
```

## TODO

- [ ] Define Stream interface
- [ ] Define API response types
- [ ] Define contract interaction types
- [ ] Add JSDoc comments
