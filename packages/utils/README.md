# @streampay/utils

Shared pure utility functions for the StreamPay monorepo.

## Purpose

This package provides pure utility functions with no side effects, used across:

- `@streampay/sdk` - Public SDK
- `@streampay/web` - Frontend application
- `@streampay/api` - Backend API

## Installation

```bash
npm install @streampay/utils
```

## Usage

```typescript
import { formatSTX, calculateClaimableAmount } from '@streampay/utils';

// Format STX amounts
const display = formatSTX(1000000n); // "1.000000 STX"

// Calculate claimable amount
const claimable = calculateClaimableAmount({
  amount: 1000000n,
  interval: 86400,
  startTime: 1234567890,
  claimedAmount: 0n,
});
```

## Utility Categories

### Formatting

- `formatSTX(microSTX)` - Format microSTX to human-readable
- `formatAddress(address)` - Truncate address for display
- `formatDuration(seconds)` - Human-readable duration

### Calculations

- `calculateClaimableAmount(stream)` - Compute claimable amount
- `calculateStreamProgress(stream)` - Percentage completed
- `calculateRefundAmount(stream)` - Pro-rata refund

### Validation

- `isValidPrincipal(address)` - Validate Stacks address
- `isValidAmount(amount)` - Validate positive amount
- `isValidInterval(interval)` - Validate stream interval

### Date/Time

- `blockHeightToTimestamp(height)` - Estimate timestamp
- `timestampToBlockHeight(timestamp)` - Estimate block height

## Scripts

```bash
npm run build      # Build package
npm run dev        # Watch mode
npm run lint       # Run ESLint
npm run test       # Run tests
```

## TODO

- [ ] Implement formatting utilities
- [ ] Implement calculation utilities
- [ ] Implement validation utilities
- [ ] Add comprehensive tests
