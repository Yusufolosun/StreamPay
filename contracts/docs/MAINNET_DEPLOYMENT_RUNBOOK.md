# StreamPay Mainnet Deployment Runbook

This runbook covers predeployment checks, deployment execution, post-deployment initialization, and verification for the three production contracts:
- stream-core
- stream-conditions
- stream-nft

## 1. Preconditions

- Node.js and npm installed
- Clarinet installed and on PATH
- Mainnet deployer account funded for deployment fees
- Deployer mnemonic available in a secure environment variable

Required environment variables:

```bash
export DEPLOYER_MNEMONIC="your 12/15/18/21/24 word mnemonic"
export DEPLOYER_ADDRESS="SP..."
# Optional
export MAINNET_RPC_URL="https://api.hiro.so"
export SBTC_TOKEN_CONTRACT="SP....sbtc-token"
```

## 2. Predeployment Safety Checks

From contracts workspace root:

```bash
cd contracts
npm test
clarinet check
```

Expected result:
- all tests pass
- all contracts compile

## 3. Generate and Validate Deployment Plan

Dry-run generation (recommended first):

```bash
./scripts/deploy.sh --network mainnet --dry-run
```

This performs:
- test + compile preflight
- mainnet plan generation via Clarinet
- deployment format validation

## 4. Execute Mainnet Deployment

When dry run is clean:

```bash
./scripts/deploy.sh --network mainnet --cost medium
```

Notes:
- --cost accepts manual|low|medium|high
- script uses a temporary settings/Mainnet.toml and cleans it up automatically

## 5. Required Post-Deployment Initialization

Run these transactions from DEPLOYER_ADDRESS in order:

1) stream-core.initialize-stream-nft-contract
- argument: DEPLOYER_ADDRESS.stream-nft

2) stream-nft.initialize-stream-core
- argument: DEPLOYER_ADDRESS.stream-core

3) stream-core.whitelist-token
- argument: deployed sBTC token contract principal

Do not enable token-based stream creation until step 3 is confirmed.

## 6. Post-Deployment Verification

Run the verification script:

```bash
./scripts/verify.sh --deployer "$DEPLOYER_ADDRESS"
```

This validates on-chain interface and source availability for all three contracts.

Then manually verify:
- stream-nft initialization status is set
- stream-core NFT contract binding is set
- sBTC token whitelist entry exists

## 7. Rollback and Incident Notes

- Contract deployment itself is immutable; rollback means redeploying new contracts.
- If initialization is missed, execute initialization transactions immediately.
- If wrong token was whitelisted, remove it and whitelist the correct token.
- Pause protocol with stream-core.emergency-pause-protocol if abnormal behavior is detected.
