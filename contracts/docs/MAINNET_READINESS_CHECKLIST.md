# StreamPay Mainnet Readiness Checklist

Use this checklist as a hard gate before deployment.

## Code and Build Integrity

- [ ] `clarinet check` passes for all contracts
- [ ] `npm test` passes in contracts workspace
- [ ] `deploy.sh`, `verify.sh`, and `post-deploy-init.sh` are executable and reviewed
- [ ] `deployments/mainnet.yaml` exists and lists contracts in dependency order (stream-nft → stream-core → stream-conditions)

## Security and Access Controls

- [ ] stream-nft initialization is owner-gated and one-time
- [ ] stream-core NFT mint/burn calls are best-effort (don't block financial operations)
- [ ] stream-core sender transfer path is restricted to configured NFT caller
- [ ] sender index consistency is preserved during sender ownership transfers
- [ ] fee withdrawal invariants are verified by tests (`contract-balance - active-liabilities`)
- [ ] dispute and cancellation paths are covered by tests
- [ ] arbiter registration enforces minimum 10,000 µSTX stake with actual STX lock
- [ ] SIP-010 transfer stubs are documented as intentionally disabled for v1

## Funds and Accounting

- [ ] stream-core accrual, claim, pause/resume, and cancel flows are tested
- [ ] stream-conditions rounding remainder behavior is tested (no dust leakage)
- [ ] protocol fee math and withdraw limits are validated by tests
- [ ] NFT receipt minting occurs on stream creation (when NFT contract initialized)
- [ ] NFT receipt burning occurs on stream cancellation

## Operational Readiness

- [ ] deployer address has sufficient STX for deployment + post-init calls (≥ 2 STX)
- [ ] DEPLOYER_MNEMONIC and DEPLOYER_ADDRESS are injected securely at runtime
- [ ] dry-run deployment plan generation succeeds
- [ ] post-deploy initialization transaction payloads are prepared (via post-deploy-init.sh)
- [ ] rollback/incident response owner is assigned
- [ ] `.gitignore` excludes all secret-containing files (Mainnet.toml, .env.local, receipts)
- [ ] No mnemonics, private keys, or real addresses are committed to the repository

## Final Go/No-Go

- [ ] deployment window approved
- [ ] all above items checked by at least two reviewers
- [ ] final commit hash and deployment command recorded in release notes
