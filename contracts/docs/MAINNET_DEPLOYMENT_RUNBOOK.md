# StreamPay Mainnet Deployment Runbook

This runbook covers predeployment checks, deployment execution, post-deployment initialization, and verification for the three production contracts:
- stream-nft (deployed first — no dependencies)
- stream-core (deployed second — depends on stream-nft)
- stream-conditions (deployed third — depends on stream-core)

## 1. Preconditions

- Node.js ≥ 20 and npm installed
- Clarinet ≥ 2.x installed and on PATH
- Mainnet deployer account funded (≥ 2 STX for deployment fees + post-init calls)
- Deployer mnemonic available in a secure environment variable

Required environment variables:

```bash
export DEPLOYER_MNEMONIC="your 24 word mnemonic"
export DEPLOYER_ADDRESS="SP..."
# Optional
export MAINNET_RPC_URL="https://api.hiro.so"
export SBTC_TOKEN_CONTRACT="SP....sbtc-token"
```

## 2. Predeployment Safety Checks

From contracts workspace root:

```bash
cd contracts
npm install
npm test
clarinet check
```

Expected result:
- all tests pass (stream-core, stream-conditions, stream-nft suites)
- all contracts compile clean with no warnings

## 3. Generate and Validate Deployment Plan

Dry-run generation (recommended first):

```bash
./scripts/deploy.sh --network mainnet --dry-run
```

This performs:
- test + compile preflight
- mainnet plan generation via Clarinet
- deployment format validation

Review the generated plan to confirm:
- Contract deployment order: stream-nft → stream-core → stream-conditions
- No mnemonic or private key appears in any generated artifact

## 4. Execute Mainnet Deployment

When dry run is clean:

```bash
./scripts/deploy.sh --network mainnet --cost medium
```

Notes:
- --cost accepts manual|low|medium|high
- Script uses a temporary settings/Mainnet.toml and cleans it up automatically
- Deployment order is enforced by the dependency graph: stream-nft first

## 5. Required Post-Deployment Initialization

Run the initialization helper to get exact transaction payloads:

```bash
./scripts/post-deploy-init.sh --network mainnet
```

Execute these transactions from DEPLOYER_ADDRESS **in order**:

### Step 1: Bind stream-nft to stream-core
```
Contract: DEPLOYER_ADDRESS.stream-nft
Function: initialize-stream-core
Argument: DEPLOYER_ADDRESS.stream-core
```

### Step 2: Bind stream-core to stream-nft
```
Contract: DEPLOYER_ADDRESS.stream-core
Function: initialize-stream-nft-contract
Argument: DEPLOYER_ADDRESS.stream-nft
```

### Step 3: Whitelist sBTC token
```
Contract: DEPLOYER_ADDRESS.stream-core
Function: whitelist-token
Argument: <sBTC token contract principal>
```

**Do not enable token-based stream creation until step 3 is confirmed.**

## 6. Post-Deployment Verification

Run the verification script:

```bash
./scripts/verify.sh --deployer "$DEPLOYER_ADDRESS"
```

This validates on-chain interface and source availability for all three contracts.

Then manually verify:
- `stream-nft.get-initialisation-status` returns `is-initialised: true`
- `stream-nft.get-initialisation-status` returns correct `stream-core-contract`
- `stream-core.get-whitelisted-tokens(sBTC)` returns `(some true)`
- Creating a small test STX stream succeeds and mints two NFT receipts

## 7. Smoke Test Procedure

After verification:
1. Create a small STX stream (e.g., 10,000 µSTX, rate 1, duration 10 blocks)
2. Verify two NFT receipts were minted (sender + recipient)
3. Wait for accrual, then claim as recipient
4. Cancel the stream as sender
5. Verify both NFT receipts were burned
6. Check `get-stream-status` returns cancelled state

## 8. Rollback and Incident Notes

- Contract deployment itself is immutable; rollback means redeploying new contracts.
- If initialization is missed, execute initialization transactions immediately.
- If wrong token was whitelisted, remove it and whitelist the correct token.
- Pause protocol with `stream-core.emergency-pause-protocol` if abnormal behavior is detected.
- Pausing does NOT affect `cancel-stream` — senders can always unwind.
