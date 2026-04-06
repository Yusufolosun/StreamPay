# StreamPay Smart Contracts

Clarity smart contracts for the StreamPay recurring payments platform.

## Overview

This directory contains Clarinet-managed smart contracts. It is **not** an npm
workspace package — Clarinet has its own project structure and tooling.

## Directory Structure

```
contracts/
├── Clarinet.toml           # Clarinet project configuration
├── contracts/              # Clarity contract source files
│   └── stream-core.clar    # Core payment stream contract
├── tests/                  # Contract test files
│   └── stream-core.test.ts # Tests for stream-core
└── settings/               # Network configurations
    └── Devnet.toml         # Local devnet settings
```

## Contracts

### stream-core.clar

The core payment streaming contract implementing:

- **Stream Creation**: Create recurring payment streams between two parties
- **Payment Claims**: Recipients claim accrued payments
- **Stream Cancellation**: Senders can cancel with pro-rata refunds
- **Pause/Resume**: Temporarily halt payment accrual

## Development

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) installed
- Node.js 20+ (for test runner)

### Commands

```bash
# Check contract syntax
clarinet check

# Run tests
clarinet test

# Launch interactive console
clarinet console

# Deploy to devnet
clarinet deployments apply -p deployments/devnet.yaml
```

## Security

- **Never commit mainnet deployment configs with real keys**
- The `Mainnet.toml` file is gitignored
- Use environment variables for sensitive configuration
- See `SECURITY_HOOKS.md` for pre-commit protection details

## TODO

- [ ] Implement stream creation
- [ ] Implement payment claiming
- [ ] Implement cancellation with refunds
- [ ] Add escrow functionality
- [ ] Add multi-recipient streams
- [ ] Audit preparation
