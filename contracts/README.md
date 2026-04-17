# contracts

Clarinet smart-contract workspace scaffold for StreamPay.

## stream-nft function coverage

Implemented public functions:
- initialize-stream-core
- mint-stream-receipt
- burn-stream-receipt
- transfer

Implemented read-only functions:
- get-last-token-id
- get-token-uri
- get-owner
- get-stream-for-token
- get-initialisation-status
- get-tokens-for-stream
- is-approved-operator

Implemented private helpers:
- is-valid-receipt-type
- has-valid-receipt-type-length
- is-authorised-core-caller
- sync-stream-core-sender-best-effort
- get-stream-receipts
- stream-receipt-slot
- set-stream-receipt-slot
- prune-empty-stream-receipts

## receipt lifecycle notes

- mint-stream-receipt is gated to stream-core through contract-caller.
- burn-stream-receipt is gated to stream-core through contract-caller.
- initialize-stream-core is one-time and permanently binds the authorised stream-core principal.
- transfer updates NFT ownership first, then attempts to sync sender receipts back into stream-core as a best-effort convenience.
- sender receipt transfer is authoritative for NFT ownership; a failed stream-core hook does not revert the NFT transfer.
- receipt-type uses string-ascii 9 because the literal RECIPIENT requires nine ASCII characters.
- approved-operators is queryable for future integrations, but the current transfer path still requires tx-sender to be the recorded owner.

## stream-core function coverage

Implemented public functions:
- create-stream
- claim-stream
- pause-stream
- resume-stream
- cancel-stream
- whitelist-token
- remove-token-from-whitelist
- transfer-stream-sender
- update-protocol-fee
- emergency-pause-protocol
- emergency-resume-protocol
- withdraw-accumulated-fees

Implemented read-only functions:
- get-stream
- get-whitelisted-tokens
- get-claimable-balance
- get-stream-status
- get-sender-streams
- get-recipient-streams
- get-protocol-fee-bps
- get-total-volume
- get-total-active-stx-deposits
- get-withdrawable-fees

Implemented private helpers:
- calculate-streamed-amount
- collect-protocol-fee
- is-stream-expired

## lifecycle behavior notes

- create-stream validates principal inputs, amount/rate/duration bounds, protocol pause state, whitelist membership for SIP-010 contracts, and sender/recipient list limits.
- claim-stream computes elapsed accrual from the latest checkpoint and caps claims by remaining deposit.
- pause-stream checkpoints accrued claimable balance before toggling paused state.
- resume-stream restarts accrual from current block while preserving pre-pause checkpoint balance.
- cancel-stream pays accrued recipient amount first, then refunds remaining deposit to sender.
- first post-deployment action: whitelist the deployed sBTC contract principal via the deployment script before creating any SIP-010 streams.

## local validation

Use file-level syntax validation while environment mnemonics are being finalized:

```bash
cd contracts
clarinet check contracts/stream-core.clar
clarinet check contracts/stream-conditions.clar
clarinet check contracts/stream-nft.clar
```

The stream-nft contract was last validated with `clarinet check contracts/stream-nft.clar` and passed syntax checking.

Project-wide checks with `clarinet check` require valid mnemonic values in Clarinet settings files.
If `clarinet check` reports invalid mnemonic word-count in `settings/Simnet.toml`, fix the mnemonic first, then re-run project-wide validation.

## key error responses

- err-invalid-recipient: recipient cannot equal sender.
- err-zero-address: recipient and optional token contract must not be zero principal.
- err-invalid-amount: stream amount must be above minimum and net deposit must remain positive.
- err-too-many-streams: sender or recipient stream index reached 50-item cap.
- err-not-authorised: caller is not permitted for the requested stream action.

## fee and accounting notes

- protocol fee is computed in basis points and collected at stream creation.
- stored stream deposit is net of protocol fee.
- total-volume tracks cumulative net deposit assigned to streams.
- claim and cancellation flows update claimed-amount and checkpoint state after transfer.

## event schema notes

- all significant state changes emit `print` tuples with: `event-type`, `stream-id`, `caller`, `block-height`, plus relevant amounts.
- required event names: `stream-created`, `stream-claimed`, `stream-paused`, `stream-resumed`, `stream-cancelled`, `fee-updated`, `protocol-paused`, `protocol-resumed`, `fees-withdrawn`.

## security sequencing

- mutating public functions perform principal authorization checks before writes.
- SIP-010 stream principals are validated against the core whitelist before any token transfer executes.
- stream-id inputs are validated before stream map reads in mutating entrypoints.
- every contract-call? site now has explicit local failure handling (unwrap! + contract-specific error code or warning event).
- stream-nft sender sync remains best-effort, but failure emits a structured warning with local-error metadata.

## stream-conditions function coverage

Implemented public functions:
- register-arbiter
- update-arbiter-stake
- create-milestone-stream
- release-milestone
- dispute-milestone
- resolve-dispute
- cancel-milestone-stream

Implemented read-only functions:
- get-milestone-stream
- get-arbiter
- get-dispute
- get-milestone-stream-id-nonce

## milestone and dispute behavior notes

- create-milestone-stream now accepts an optional token contract principal and routes STX or SIP-010 transfers accordingly.
- SIP-010 milestone streams must pass the stream-core whitelist check before creation; stream-core remains the single source of truth for token policy.
- create-milestone-stream enforces a strict basis-points invariant where the milestone sum must equal exactly 10000.
- escrow capture occurs during stream creation and all outbound releases/refunds are sent from contract balance.
- release-milestone allows sender release or arbiter release when a dispute is active for that milestone.
- dispute-milestone can only be raised by recipient and requires a configured arbiter.
- resolve-dispute supports dual outcomes: release to recipient or refund to sender, then marks dispute resolved.
- cancel-milestone-stream refunds only unreleased milestone amounts and rejects while any dispute remains active.
