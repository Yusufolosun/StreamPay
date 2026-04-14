# StreamPay Environment Variable Architecture

> **Last updated:** 2026-04-08  
> **Maintainer:** StreamPay Team

This document defines the environment variable architecture for the StreamPay monorepo, including naming conventions, security requirements, and environment promotion workflows.

---

## Table of Contents

1. [Variable Reference Table](#variable-reference-table)
2. [Naming Conventions](#naming-conventions)
3. [Environment Promotion Path](#environment-promotion-path)
4. [Secret Rotation Checklist](#secret-rotation-checklist)
5. [Security Guidelines](#security-guidelines)

---

## Variable Reference Table

### apps/web (Next.js Frontend)

| Variable | Required | Description | Example Format |
|----------|----------|-------------|----------------|
| `NEXT_PUBLIC_STACKS_NETWORK` | Yes | Target Stacks network | `devnet` \| `testnet` \| `mainnet` |
| `NEXT_PUBLIC_STREAM_CORE_ADDRESS` | Yes | Stream core contract address | `ST1XXX.stream-core` |
| `NEXT_PUBLIC_STREAM_CONDITIONS_ADDRESS` | Yes | Conditions contract address | `ST1XXX.stream-conditions` |
| `NEXT_PUBLIC_STREAM_NFT_ADDRESS` | Yes | NFT contract address | `ST1XXX.stream-nft` |
| `NEXT_PUBLIC_HIRO_API_URL` | Yes | Hiro API base URL | `https://api.testnet.hiro.so` |
| `NEXT_PUBLIC_HIRO_API_KEY` | No | Hiro API key (rate limits) | `hiro_xxxxx` |
| `NEXT_PUBLIC_APP_NAME` | Yes | Application display name | `StreamPay` |

### apps/api (Express/Node.js Backend)

| Variable | Required | Description | Example Format |
|----------|----------|-------------|----------------|
| `PORT` | Yes | HTTP server port | `3001` |
| `NODE_ENV` | Yes | Node environment | `development` \| `test` \| `production` |
| `STACKS_NETWORK` | Yes | Target Stacks network | `devnet` \| `testnet` \| `mainnet` |
| `HIRO_API_URL` | Yes | Hiro API base URL | `https://api.testnet.hiro.so` |
| `HIRO_API_KEY` | Prod | Hiro API key (server-side) | `hiro_xxxxx` |
| `CONTRACT_STREAM_CORE` | Yes | Stream core contract address | `ST1XXX.stream-core` |
| `CONTRACT_STREAM_CONDITIONS` | Yes | Conditions contract address | `ST1XXX.stream-conditions` |
| `CONTRACT_STREAM_NFT` | Yes | NFT contract address | `ST1XXX.stream-nft` |
| `DATABASE_URL` | Yes | PostgreSQL connection string | `postgresql://user:pass@host:5432/db` |
| `JWT_SECRET` | Yes | JWT signing secret (32+ chars) | `<64-char-hex>` |
| `CORS_ORIGINS` | Yes | Allowed CORS origins | `https://app.streampay.io` |

### contracts (Clarinet)

| Variable | Required | Description | Example Format |
|----------|----------|-------------|----------------|
| `DEPLOYER_MNEMONIC` | Yes | 24-word BIP-39 seed phrase | `word1 word2 ... word24` |
| `STACKS_NETWORK` | Yes | Deployment target network | `devnet` \| `testnet` \| `mainnet` |
| `CLARITY_VERSION` | Yes | Clarity language version | `2` |
| `SBTC_CONTRACT_ADDRESS` | Post-deploy | Deployed sBTC contract principal for whitelist action | `ST...sbtc-token` |

### packages/sdk

| Variable | Required | Description | Example Format |
|----------|----------|-------------|----------------|
| `SDK_TEST_NETWORK` | Test | Network for integration tests | `devnet` \| `testnet` |
| `SDK_TEST_CONTRACT_ADDRESS` | Test | Test target contract | `ST1XXX.stream-core` |
| `SDK_TEST_PRIVATE_KEY` | Test | Testnet-only signing key | `<64-char-hex>` |

### packages/types

| Variable | Required | Description | Example Format |
|----------|----------|-------------|----------------|
| *(none currently)* | — | TypeScript types package (no runtime config) | — |

### packages/utils

| Variable | Required | Description | Example Format |
|----------|----------|-------------|----------------|
| *(none currently)* | — | Utility functions package (no runtime config) | — |

---

## Naming Conventions

### Prefix Rules

Understanding prefixes is critical for security. The wrong prefix can expose secrets to the browser.

| Prefix | Scope | Exposure | Usage |
|--------|-------|----------|-------|
| `NEXT_PUBLIC_` | Frontend | **Public** (bundled in JS) | Browser-safe config only |
| `CONTRACT_` | Backend | Server-only | Smart contract addresses |
| `SDK_TEST_` | SDK | Development only | Integration testing |
| *(none)* | Backend | Server-only | General server config |

### Key Principles

1. **NEXT_PUBLIC_ variables are PUBLIC**: They are embedded in the client-side JavaScript bundle and visible to anyone. Never use this prefix for secrets.

2. **Server-only secrets**: `HIRO_API_KEY`, `JWT_SECRET`, `DATABASE_URL`, and `DEPLOYER_MNEMONIC` must NEVER have a `NEXT_PUBLIC_` prefix.

3. **Consistency across workspaces**: Use the same variable names for the same values (e.g., `STACKS_NETWORK` in both `apps/api` and `contracts`).

4. **Address format**: All contract addresses use the format `<principal>.<contract-name>`:
   - Devnet/Testnet: `ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core`
   - Mainnet: `SP1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.stream-core`

---

## Environment Promotion Path

StreamPay follows a three-stage environment promotion workflow. Each stage has specific requirements and variable values.

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ENVIRONMENT PROMOTION PATH                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────┐         ┌─────────┐         ┌─────────┐                      │
│   │ DEVNET  │ ──────► │ TESTNET │ ──────► │ MAINNET │                      │
│   └─────────┘         └─────────┘         └─────────┘                      │
│       │                   │                   │                             │
│       ▼                   ▼                   ▼                             │
│   Local dev           Staging             Production                        │
│   Clarinet            Hiro testnet        Stacks mainnet                   │
│   Mock data           Real txns           Real funds                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Stage 1: Devnet (Local Development)

**Purpose:** Rapid iteration with instant block times and unlimited test STX.

| Variable | Devnet Value |
|----------|--------------|
| `STACKS_NETWORK` | `devnet` |
| `HIRO_API_URL` | `http://localhost:3999` |
| Contract addresses | `ST1PQHQKV...` (Clarinet default) |
| `DEPLOYER_MNEMONIC` | Clarinet-generated test mnemonic |

**Characteristics:**
- Runs locally via `clarinet devnet start`
- Instant block confirmation
- No rate limits
- Test wallets with unlimited STX

### Stage 2: Testnet (Staging)

**Purpose:** Integration testing with real network conditions.

| Variable | Testnet Value |
|----------|--------------|
| `STACKS_NETWORK` | `testnet` |
| `HIRO_API_URL` | `https://api.testnet.hiro.so` |
| Contract addresses | Deployed testnet addresses (`ST...`) |
| `DEPLOYER_MNEMONIC` | Dedicated testnet wallet |

**Characteristics:**
- Real Stacks testnet (15-30 min block times)
- Hiro API rate limits apply (use API key)
- Free testnet STX from faucet
- Public contract deployment

**Promotion Checklist (Devnet → Testnet):**
- [ ] All unit tests passing
- [ ] Contract analysis clean (`clarinet check`)
- [ ] Testnet deployer wallet funded
- [ ] Update contract addresses after deployment
- [ ] Update API URLs to testnet endpoints

### Stage 3: Mainnet (Production)

**Purpose:** Live production environment with real value.

| Variable | Mainnet Value |
|----------|--------------|
| `STACKS_NETWORK` | `mainnet` |
| `HIRO_API_URL` | `https://api.mainnet.hiro.so` |
| Contract addresses | Deployed mainnet addresses (`SP...`) |
| `DEPLOYER_MNEMONIC` | **NEVER IN ENV FILES** |

**Characteristics:**
- Real STX with real value
- Immutable contract deployments
- Must pass security audit first
- Use hardware wallet for deployment

**Promotion Checklist (Testnet → Mainnet):**
- [ ] Security audit completed
- [ ] All integration tests passing on testnet
- [ ] Contract addresses verified on explorer
- [ ] Mainnet deployer uses hardware wallet (not env var)
- [ ] Rate limiting and monitoring configured
- [ ] Incident response plan documented
- [ ] Whitelist the deployed sBTC contract principal before creating any SIP-010 streams

---

## Secret Rotation Checklist

Use this checklist when rotating secrets. Each secret type has different procedures, impacts, and downtime considerations. Plan rotations during low-traffic periods.

### JWT_SECRET Rotation

**Impact:** All existing JWT tokens become invalid. Users must re-authenticate.

- [ ] Generate new secret: `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
- [ ] Update in production environment
- [ ] Restart API servers
- [ ] Monitor authentication errors
- [ ] Communicate maintenance window to users

### HIRO_API_KEY Rotation

**Impact:** API requests may fail briefly during rotation.

- [ ] Generate new key at https://platform.hiro.so
- [ ] Update in all environments (api, potentially frontend)
- [ ] Verify API connectivity after update
- [ ] Revoke old key in Hiro dashboard

### DATABASE_URL Rotation (Password Change)

**Impact:** Database connections fail until all services updated.

- [ ] Create new database user/password
- [ ] Update connection string in environment
- [ ] Restart all services using database
- [ ] Verify database connectivity
- [ ] Remove old database user

### DEPLOYER_MNEMONIC Rotation

**Impact:** Deployment address changes. Existing contracts unaffected but new deployments use new address.

- [ ] Generate new mnemonic with hardware wallet or secure method
- [ ] Fund new deployer wallet
- [ ] Update deployment configurations
- [ ] Document new deployer address
- [ ] **Do NOT commit new mnemonic anywhere**

### SDK_TEST_PRIVATE_KEY Rotation

**Impact:** Integration tests fail until updated.

- [ ] Generate new testnet wallet
- [ ] Fund from testnet faucet
- [ ] Update in SDK environment
- [ ] Verify tests pass with new key

---

## Security Guidelines

### Files That MUST NEVER Be Committed

| Pattern | Reason |
|---------|--------|
| `.env` | Contains actual secrets |
| `.env.local` | Local overrides with secrets |
| `.env.*.local` | Environment-specific secrets |
| `**/mnemonic*` | Wallet seed phrases |
| `**/mainnet.yaml` | Mainnet deployment configs |

### Safe to Commit

| Pattern | Reason |
|---------|--------|
| `.env.example` | Template with placeholder values only |
| `.env.template` | Same as .env.example |
| `devnet.yaml` | Local development config |

### Verification Commands

```bash
# Check for accidentally committed secrets
git log --all --full-history -- "**/.env"
git log --all --full-history -- "**/mnemonic*"

# Verify .gitignore is working
git status --ignored

# Run secret scanner
npm run lint:secrets
```

---

## Quick Reference

### Copy Commands for New Developers

```bash
# Option 1: Use the setup script (recommended)
npm run setup:env

# Option 2: Manual copy
cp apps/web/.env.example apps/web/.env.local
cp apps/api/.env.example apps/api/.env.local
cp contracts/.env.example contracts/.env.local
cp packages/sdk/.env.example packages/sdk/.env.local
cp packages/types/.env.example packages/types/.env.local
cp packages/utils/.env.example packages/utils/.env.local

# Then fill in values in each .env.local file
```

### Validate Environment Configuration

```bash
# Check all .env.example files are valid
npm run check:env
```

### Environment Variable Loading Order (Next.js)

1. `.env` (lowest priority)
2. `.env.local`
3. `.env.[environment]`
4. `.env.[environment].local` (highest priority)

The `NEXT_PUBLIC_` prefix exposes variables to the browser bundle.

---

*This document is the authoritative reference for StreamPay environment configuration. Update it whenever adding new environment variables.*
