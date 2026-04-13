<div align="center">

<img src="https://img.shields.io/badge/Bitcoin-L2-orange?style=for-the-badge&logo=bitcoin&logoColor=white" />
<img src="https://img.shields.io/badge/Stacks-Mainnet-5546FF?style=for-the-badge" />
<img src="https://img.shields.io/badge/Clarity-Smart%20Contracts-00D4AA?style=for-the-badge" />
<img src="https://img.shields.io/badge/sBTC-Powered-F7931A?style=for-the-badge" />

# StreamPay

### Programmable Bitcoin Payroll & Invoice Streaming — Built on Stacks

*The first real-time salary and invoice protocol on a Bitcoin Layer 2. Pay in sBTC. Per second. On-chain. No banks.*

[Live App](#) · [Documentation](#) · [SDK](#) · [Smart Contracts](#) · [Report Bug](#)

---

</div>

## Overview

StreamPay is a programmable payment streaming protocol built on the Stacks blockchain, secured by Bitcoin. It enables employers, DAOs, and clients to stream sBTC to recipients in real time — per block, continuously, with full on-chain enforcement.

No monthly payroll runs. No invoice chasing. No wire transfers. Funds flow the moment work begins, stop the moment it ends, and every satoshi is accounted for on-chain with Bitcoin-level finality.

```
Sender deposits sBTC → Stream opens → Recipient earns per block → Withdraws anytime
```

---

## The Problem

The global freelance economy exceeds **$1.5 trillion**. Crypto-native teams, DAOs, and Web3 builders are paid via manual lump-sum transfers — monthly, delayed, error-prone, and trust-dependent. Existing solutions:

| Problem | Current Reality |
|---|---|
| Payroll timing | Monthly or bi-weekly manual transfers |
| Invoice payment | 30–90 day net terms, high default risk |
| DAO contributor pay | Manual multisig execution, governance overhead |
| BTC holders paying teams | Must convert to stablecoin or use CEX rails |
| Grant distribution | Lump sum with no milestone enforcement |

**None of this needs to exist.** Payment streaming eliminates all of it — programmatically, on-chain, without intermediaries.

---

## The Solution

StreamPay introduces three core payment primitives, all implemented in Clarity smart contracts on Stacks mainnet:

### 🔵 Continuous Streams
Deposit sBTC into a vault. Specify a recipient and a rate (sBTC per block). Funds accumulate in real time. Recipient withdraws whenever they want. Sender can pause or cancel with instant clawback of unstreamed funds.

### 🟠 Milestone Streams
Lock the full invoice amount in escrow. Define up to 10 milestones with percentage allocations. Each milestone release is triggered by the sender — or by a neutral arbiter if dispute resolution is configured. Non-released funds are always clawback-eligible.

### 🟣 Fixed-Term Vesting
Deploy a time-locked vesting contract for team token allocations or contributor equity. Cliff + linear vesting enforced entirely on-chain. No manual unlock, no trust in an administrator.

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        StreamPay                            │
├──────────────────┬──────────────────┬───────────────────────┤
│  stream-core     │ stream-conditions │    stream-nft         │
│  .clar           │ .clar             │    .clar              │
│                  │                   │                       │
│  • Stream CRUD   │  • Milestone logic│  • SIP-009 receipts   │
│  • Rate engine   │  • Arbiter roles  │  • Tradeable streams  │
│  • Clawback      │  • Condition eval │  • Metadata on-chain  │
│  • Fee deduction │  • Multi-release  │  • Transfer hooks     │
└──────────────────┴──────────────────┴───────────────────────┘
          │                   │                    │
          └───────────────────┴────────────────────┘
                              │
                    ┌─────────▼──────────┐
                    │   streampay-sdk     │
                    │   (TypeScript)      │
                    │                     │
                    │  createStream()     │
                    │  cancelStream()     │
                    │  getBalance()       │
                    │  createMilestone()  │
                    │  claimFunds()       │
                    └─────────┬──────────┘
                              │
               ┌──────────────▼──────────────┐
               │      React Frontend          │
               │                              │
               │  Sender Dashboard            │
               │  Recipient Dashboard         │
               │  Invoice Builder             │
               │  Stream Explorer             │
               └──────────────────────────────┘
```

### Smart Contract Layer

| Contract | Function | Status |
|---|---|---|
| `stream-core.clar` | Core stream creation, rate engine, pause/cancel, clawback | ✅ Mainnet |
| `stream-conditions.clar` | Milestone gates, arbiter logic, conditional release | ✅ Mainnet |
| `stream-nft.clar` | SIP-009 stream receipts, tradeable stream positions | ✅ Mainnet |

### Tech Stack

| Layer | Technology |
|---|---|
| Smart Contracts | Clarity (Stacks) |
| Frontend | Next.js 14, TypeScript, Tailwind CSS |
| Wallet Integration | Leather, Xverse (via `@stacks/connect`) |
| Chain Data | Hiro Platform API |
| SDK | TypeScript, published to npm |
| Deployment | Stacks Mainnet |

---

## Features

- **Real-time sBTC streaming** — funds accumulate per block (~5s after Nakamoto)
- **Milestone-based invoicing** — release payment in stages, not lump sums
- **SIP-009 stream NFTs** — streams are tradeable positions; sell your future income
- **Instant clawback** — unstreamed funds return immediately on cancellation
- **Configurable protocol fee** — default 0.25%, max 1.00%, governance-updatable
- **Multi-token support** — sBTC, STX, SIP-010 tokens
- **Dispute arbiter** — optional neutral third-party for milestone resolution
- **Zero custodianship** — no keys, no admin access, fully self-sovereign

---

## SDK — `@streampay/sdk`

Any Stacks application, DAO tool, or payment platform can embed StreamPay in minutes.

### Installation

```bash
npm install @streampay/sdk
# or
yarn add @streampay/sdk
```

### Quick Start

```typescript
import { StreamPayClient } from '@streampay/sdk';

const client = new StreamPayClient({
  network: 'mainnet',
  senderAddress: 'SP2...',
});

// Create a continuous stream
const stream = await client.createStream({
  recipient: 'SP3...',
  token: 'sbtc',
  ratePerBlock: 100_000, // in satoshis
  durationBlocks: 4320,  // ~30 days
});

console.log(stream.id); // on-chain stream ID
```

### Milestone Invoice

```typescript
const invoice = await client.createMilestoneStream({
  recipient: 'SP3...',
  token: 'sbtc',
  totalAmount: 5_000_000, // 0.05 sBTC
  milestones: [
    { label: 'Design complete',     basisPoints: 2000 }, // 20%
    { label: 'Dev complete',        basisPoints: 5000 }, // 50%
    { label: 'Final delivery',      basisPoints: 3000 }, // 30%
  ],
  arbiter: 'SP_ARBITER_ADDRESS', // optional
});
```

### Core Methods

```typescript
// Stream lifecycle
client.createStream(params)         // open a continuous stream
client.pauseStream(streamId)        // pause — no funds flow
client.resumeStream(streamId)       // resume from current balance
client.cancelStream(streamId)       // cancel + clawback unstreamed
client.getStreamBalance(streamId)   // real-time claimable balance

// Milestones
client.createMilestoneStream(params)
client.releaseMilestone(streamId, milestoneIndex)
client.disputeMilestone(streamId, milestoneIndex)

// Recipient
client.claimFunds(streamId)         // withdraw accumulated balance
client.getIncomingStreams(address)   // all streams for a recipient

// Analytics
client.getStreamVolume(address)     // total streamed in/out
client.getAllStreams(filters)        // paginated stream explorer
```

---

## Use Cases

### DAOs & Protocol Teams
Replace monthly contributor multisig payouts with continuous streams. Governance sets the rate. Execution is automatic. No more "when payment?" in Discord.

```
DAO Treasury → stream-core.clar → Contributor wallet
                (per-block, auto)
```

### Freelancers & Clients
Invoice with a milestone stream. Client locks funds on-chain. No invoice chasing. No net-90 terms. Funds release when deliverables are accepted — enforced by the contract, not trust.

### Grant Programs
Stacks Foundation, Bitcoin Frontier Fund, and similar programs distribute grants in lump sums. StreamPay enables per-milestone grant streaming — funds release as builders hit targets, not as promises are made.

### Token Vesting
Team allocations, advisor equity, and investor lockups enforced entirely on-chain. Cliff periods and linear vesting without a trusted administrator.

### Hackathon Prizes
Prize pools stream live to winners' wallets during the closing ceremony. No waiting for manual distributions.

---

## Getting Started

### Prerequisites

```bash
node >= 18
clarinet >= 2.0
```

### Run Locally

```bash
git clone https://github.com/yourscope/streampay
cd streampay
npm install

# Run contracts locally
cd contracts
clarinet check
clarinet test

# Run frontend
cd ../frontend
npm install
npm run dev
```

### Environment

```bash
# frontend/.env.local
NEXT_PUBLIC_NETWORK=mainnet
NEXT_PUBLIC_CONTRACT_ADDRESS=SP...
NEXT_PUBLIC_HIRO_API_KEY=your_key
```

---

## Contract Addresses — Mainnet

| Contract | Address |
|---|---|
| `stream-core` | `SP....stream-core` |
| `stream-conditions` | `SP....stream-conditions` |
| `stream-nft` | `SP....stream-nft` |

---

## Roadmap

```
Q2 2026   ✅  Core contracts deployed to mainnet
          ✅  Sender + Recipient dashboards live
          ✅  SDK v1.0 published to npm
          🔄  Milestone stream UI (in progress)

Q3 2026   🔲  USDCx (native USDC on Stacks) support
          🔲  Stream NFT marketplace
          🔲  Mobile-responsive PWA
          🔲  DAO payroll templates

Q4 2026   🔲  Undercollateralized advance (stream as collateral)
          🔲  Cross-chain streams via Wormhole
          🔲  API tier for enterprise integrations
          🔲  Governance contract + STREAM token
```

---

## Security

StreamPay contracts are written in **Clarity** — a decidable, interpreted smart contract language with no reentrancy, no compiler bugs, and fully auditable execution paths.

- No admin keys — no account can pause the protocol
- User-controlled clawback — senders always retain clawback rights on unstreamed funds
- Recipient-only withdrawal — only the designated address can claim accumulated funds
- Fee cap enforced on-chain — protocol fee cannot exceed 1.00% regardless of governance action
- Audit: *[pending — Asymmetric Research engagement in progress]*

To report a vulnerability: **security@streampay.btc**

---

## Contributing

Contributions are welcome. Please read [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a PR.

```bash
git checkout -b feat/your-feature
# make changes
git commit -m "feat: your feature description"
git push origin feat/your-feature
# open PR against main
```

All commits follow [Conventional Commits](https://www.conventionalcommits.org/). All Clarity changes require passing `clarinet test` before review.

---

## License

MIT — see [LICENSE](./LICENSE)

---

<div align="center">

Built on [Stacks](https://stacks.co) · Secured by [Bitcoin](https://bitcoin.org) · Powered by [sBTC](https://stacks.co/sbtc)

*StreamPay is experimental software. Use at your own risk. This is not financial advice.*

</div>
