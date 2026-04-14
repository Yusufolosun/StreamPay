# StreamPay — Project Description

## One-Line

> Programmable sBTC payroll and invoice streaming on Stacks — the first real-time Bitcoin payment protocol for DAOs, freelancers, and crypto-native teams.

---

## The Market Opportunity

The global freelance economy exceeds **$1.5 trillion annually**. Crypto-native teams, DAOs, and Web3 builders are paid via manual lump-sum transfers — monthly, delayed, error-prone, and entirely dependent on trust between parties.

At the same time, sBTC — a 1:1 Bitcoin-backed asset on Stacks — now holds over **$545M in TVL** and represents the most mature Bitcoin programmability primitive ever deployed. Institutions including Jump Crypto, UTXO Capital, BitGo, and Hex Trust are actively deploying capital into the Stacks ecosystem. Native USDC (USDCx) launched on Stacks via Circle's xReserve in 2025.

The infrastructure for Bitcoin-native payments exists. The application layer does not.

**StreamPay is that application layer.**

---

## Problem Statement

### For Employers & DAOs
DAO contributor payroll is manual, governance-heavy, and trust-dependent. Every payment requires a multisig transaction, a governance vote, or both. There is no way to set a salary and have it execute automatically, continuously, without human intervention every cycle. The result: contributors wait weeks for payment, treasuries execute dozens of unnecessary transactions monthly, and the operational overhead of paying people in crypto remains higher than in traditional finance.

### For Freelancers & Independent Contractors
Invoice payment in crypto follows the same broken pattern as Web2: net-30, net-60, or net-90 terms with no on-chain enforcement. A client can promise payment and disappear. A freelancer can deliver work and have no recourse. Escrow exists but is clunky — it requires trust in the escrow provider, manual release, and offers no granularity for staged deliverables.

### For Bitcoin Holders Paying Teams
A BTC holder who wants to pay a team or service provider in Bitcoin must either convert to stablecoin (defeating the point), use a centralized exchange (custody risk), or execute manual transfers (operational overhead). There is no native, non-custodial way to stream BTC to a recipient automatically, on a schedule, with clawback rights.

---

## Solution

StreamPay introduces three programmable payment primitives deployed as Clarity smart contracts on Stacks mainnet:

### Primitive 1 — Continuous Streams
A sender deposits sBTC or another approved SIP-010 token into a vault contract and specifies a recipient address and a rate per block. Funds accumulate in real time — approximately every 5 seconds after the Nakamoto upgrade. The recipient can withdraw their accumulated balance at any time. The sender can pause or cancel the stream at any time, with instant clawback of all unstreamed funds. No intermediary. No custodian. Pure on-chain enforcement.

**Built for:** Salary, retainer agreements, subscription payments, recurring service fees.

### Primitive 2 — Milestone Streams
The full invoice amount is locked in a Clarity escrow contract at the time of agreement. The sender defines up to 10 milestones with percentage allocations. Each milestone is released by the sender upon deliverable acceptance — or by a designated neutral arbiter if the parties configure dispute resolution. Any unreleased funds at cancellation return immediately to the sender.

**Built for:** Freelance project invoicing, grant disbursement, contract work with staged deliverables.

### Primitive 3 — Fixed-Term Vesting
A time-locked vesting contract enforces cliff and linear vesting schedules for team allocations, advisor equity, or investor lockups. No admin key can accelerate or block vesting. The schedule is immutable once deployed. Recipients claim what has vested; nothing else is accessible.

**Built for:** Token vesting, contributor equity, long-term incentive programs.

---

## Why Stacks, Why Now

**Bitcoin finality.** Every StreamPay transaction inherits Bitcoin's proof-of-work security. Once a stream payment is recorded, it is as irreversible as a Bitcoin block. No rollbacks, no reorgs that threaten fund safety.

**Clarity's decidability.** Clarity contracts are not compiled — they are interpreted, with fully auditable execution paths. Every possible outcome of a StreamPay contract can be verified before deployment. No reentrancy attacks. No compiler vulnerabilities. This is the correct language for a financial protocol handling real capital.

**Typed token routing.** Clarity does not support storing a trait reference in a map and later dynamically dispatching to an arbitrary implementation. StreamPay therefore stores the token contract principal directly, validates it against a whitelist, and passes that typed principal through each transfer path.

**sBTC as the payment asset.** sBTC is the only non-custodial, 1:1 Bitcoin-backed asset with decentralized minting and redemption. Paying a contractor in sBTC means they hold an asset redeemable 1:1 for BTC at any time, with no exchange, no custodian, and no counterparty risk.

**Nakamoto upgrade.** Post-Nakamoto, Stacks produces blocks approximately every 5 seconds. Per-block payment streaming is now practical. Pre-Nakamoto (10-minute blocks tied 1:1 to Bitcoin), streaming UX was too coarse for real-time payroll. The upgrade unlocked the use case.

**No competition.** Sablier has processed billions in streaming payments on Ethereum. There is no equivalent on any Bitcoin Layer 2. StreamPay is first.

---

## Architecture Summary

StreamPay is composed of three layers:

**Protocol Layer — Clarity Smart Contracts**
Three interdependent contracts deployed to Stacks mainnet handle all payment logic, state management, and fund custody. Contracts hold no admin keys. All state transitions are user-initiated or time-triggered.

| Contract | Responsibility |
|---|---|
| `stream-core.clar` | Stream creation, token whitelist policy, rate calculation, pause/cancel, clawback, fee collection |
| `stream-conditions.clar` | Milestone definitions, arbiter configuration, conditional release logic, shared whitelist validation |
| `stream-nft.clar` | SIP-009 stream receipt NFTs — tradeable positions representing future income |

**SDK Layer — `@streampay/sdk`**
A TypeScript SDK published to npm that abstracts all contract interactions into clean, typed methods. Any Stacks application, DAO tooling platform, or payment integration can embed StreamPay functionality without reading Clarity directly.

**Application Layer — React Frontend**
Two primary interfaces: a Sender Dashboard for creating and managing streams, and a Recipient Dashboard for monitoring incoming streams and claiming funds. A Stream Explorer allows anyone to inspect on-chain payment activity.

---

## Stream NFTs — The Non-Obvious Feature

Every stream generates a SIP-009 NFT — a receipt token representing the sender's clawback rights or the recipient's future income claim. These NFTs are transferable.

When a sender receipt moves, the NFT contract treats the transfer as authoritative and attempts to sync the stream sender inside stream-core as a best-effort convenience. If the sync call fails, the NFT transfer still succeeds.

This creates a secondary market primitive: a recipient can sell their future income stream to a buyer at a discount for immediate liquidity. A sender can transfer their clawback rights. A DAO can fractionalize a grant stream across contributors.

This is not a speculative feature — it mirrors real-world receivables financing and invoice factoring, now executable on-chain without a bank.

---

## SDK — The Ecosystem Play

`@streampay/sdk` is designed to be embedded, not just used.

```typescript
import { StreamPayClient } from '@streampay/sdk';

const client = new StreamPayClient({ network: 'mainnet', senderAddress });

await client.createStream({ recipient, token: 'sbtc', ratePerBlock, durationBlocks });
await client.claimFunds(streamId);
await client.getStreamBalance(streamId);
```

**Target integrators:**
- DAO tooling platforms (Jokerace, Snapshot equivalents on Stacks)
- NFT platforms distributing royalty streams to creators
- Grant management platforms (Stacks Foundation, Bitcoin Frontier Fund)
- Hackathon organizers distributing prizes in real time
- Freelance marketplaces building on Stacks

Every integration extends the protocol's reach without additional contract deployment. The SDK is the monetization vector — a pro API tier with rate limits, analytics, and webhook support creates recurring revenue from integrators.

---

## Competitive Landscape

| Protocol | Chain | Streaming | Milestones | BTC-Native | NFT Receipts |
|---|---|---|---|---|---|
| Sablier v2 | Ethereum | ✅ | ✅ | ❌ | ✅ |
| Superfluid | Polygon/EVM | ✅ | ❌ | ❌ | ❌ |
| LlamaPay | Multi-EVM | ✅ | ❌ | ❌ | ❌ |
| DrizzleonStacks | Stacks | ✅ | ✅ | ✅ | ✅ |
| **StreamPay** | **Stacks** | ✅ | ✅ | ✅ | ✅ |

**StreamPay is the only payment streaming protocol on any Bitcoin Layer 2.** The EVM-based protocols handle Ethereum assets. None of them touch BTC natively, and none of them benefit from Bitcoin's proof-of-work finality.

---

## Target Audience

**Primary — Crypto-Native Teams & DAOs**
DAOs on Stacks, DeFi protocols paying contributors, hackathon prize organizers. Immediate market. Culturally aligned. Already using sBTC and STX.

**Secondary — Web3 Freelancers & Clients**
Clarity developers, Solidity developers working across chains, designers, marketers, and writers being paid in crypto. The client-freelancer relationship is the most pain-ridden payment scenario in crypto.

**Tertiary — Institutions Entering Stacks**
BitGo, Hex Trust, Copper, and FORDEFI have all integrated sBTC custody in 2025. Treasury teams at institutions holding sBTC need ways to deploy it productively. Payroll streaming to contractors is a compliant, low-risk first deployment of sBTC capital.

---

## Traction Foundation

StreamPay's protocol layer is built on **DrizzleonStacks** — three Clarity smart contracts already deployed to Stacks mainnet covering continuous streaming, on-chain condition types, and SIP-009 stream NFTs. This is not a whitepaper project. The core cryptographic and financial logic is live, audited, and functioning.

The remaining work is the application layer: frontend, SDK packaging, documentation, and go-to-market. The hardest technical problem is already solved.

---

## Revenue Model

| Source | Mechanism | Rate |
|---|---|---|
| Protocol fee | Deducted from each stream at creation | 0.25% of stream value |
| SDK Pro tier | Rate-limited API + analytics + webhooks | Monthly SaaS subscription |
| Enterprise licensing | White-label deployment for large DAOs or platforms | Annual license |
| Stream NFT royalties | Secondary market royalty on stream NFT transfers | 2.5% |

At $10M in cumulative streaming volume — a conservative target given Sablier processes billions — protocol fees alone generate $25,000. At $100M, $250,000. Revenue scales directly with ecosystem usage.

---

## Team Requirement

StreamPay can be built and launched by a solo developer with the following profile:

- Clarity smart contract development (core contracts are drafted)
- TypeScript / React frontend development
- npm package publishing and SDK design
- Stacks ecosystem knowledge (sBTC, SIP-009, SIP-010 standards)
- Security-first development discipline

Optional but high-leverage: a designer for frontend polish, a DevRel contributor for ecosystem partnership outreach.

---

## Funding & Grants

StreamPay is aligned with active Stacks funding programs:

- **Stacks Grants Program** — directly supports Bitcoin application development
- **Bitcoin Frontier Fund** — has funded BitFlow and other Stacks-native DeFi infrastructure
- **Stacks Ascent** — builder program offering mentorship, grants, and investor connections
- **Code for Stacks** — monthly incentives for active mainnet builders

The combination of live contract infrastructure, clear market gap, and SDK strategy positions StreamPay as a high-priority grant recipient in any of these programs.

---

## Summary

StreamPay is the payment layer Bitcoin DeFi is missing.

The contracts work. The asset (sBTC) is live and growing. The infrastructure (Nakamoto, Clarity 4) is ready. The market (global freelance, DAO payroll, institutional Bitcoin deployment) is enormous. No equivalent exists on any Bitcoin Layer 2.

The window to be first is open. It will not stay open.

---

*StreamPay · Built on Stacks · Secured by Bitcoin*
