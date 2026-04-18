# StreamPay Mainnet Readiness Checklist

Use this checklist as a hard gate before deployment.

## Code and Build Integrity

- [ ] `clarinet check` passes for all contracts
- [ ] `npm test` passes in contracts workspace
- [ ] `deploy.sh` and `verify.sh` are executable and reviewed
- [ ] `deployments/mainnet.yaml` exists and points to the correct contract paths

## Security and Access Controls

- [ ] stream-nft initialization is owner-gated and one-time
- [ ] stream-core sender transfer path is restricted to configured NFT caller
- [ ] sender index consistency is preserved during sender ownership transfers
- [ ] fee withdrawal invariants are verified by tests
- [ ] dispute and cancellation paths are covered by tests

## Funds and Accounting

- [ ] stream-core accrual, claim, pause/resume, and cancel flows are tested
- [ ] stream-conditions rounding remainder behavior is tested (no dust leakage)
- [ ] protocol fee math and withdraw limits are validated by tests

## Operational Readiness

- [ ] deployer address has sufficient STX for deployment + post-init calls
- [ ] DEPLOYER_MNEMONIC and DEPLOYER_ADDRESS are injected securely at runtime
- [ ] dry-run deployment plan generation succeeds
- [ ] post-deploy initialization transaction payloads are prepared
- [ ] rollback/incident response owner is assigned

## Final Go/No-Go

- [ ] deployment window approved
- [ ] all above items checked by at least two reviewers
- [ ] final commit hash and deployment command recorded in release notes
