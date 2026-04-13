# contracts

Clarinet smart-contract workspace scaffold for StreamPay.

## stream-core function coverage

Implemented public functions:
- create-stream
- claim-stream
- pause-stream
- resume-stream
- cancel-stream
- transfer-stream-sender
- update-protocol-fee
- emergency-pause-protocol
- emergency-resume-protocol
- withdraw-accumulated-fees

Implemented read-only functions:
- get-stream
- get-claimable-balance
- get-stream-status
- get-sender-streams
- get-recipient-streams
- get-protocol-fee-bps
- get-total-volume

Implemented private helpers:
- calculate-streamed-amount
- collect-protocol-fee
- is-stream-expired

## lifecycle behavior notes

- create-stream validates principal inputs, amount/rate/duration bounds, protocol pause state, and sender/recipient list limits.
- claim-stream computes elapsed accrual from the latest checkpoint and caps claims by remaining deposit.
- pause-stream checkpoints accrued claimable balance before toggling paused state.
- resume-stream restarts accrual from current block while preserving pre-pause checkpoint balance.
- cancel-stream pays accrued recipient amount first, then refunds remaining deposit to sender.

## local validation

Use file-level syntax validation while environment mnemonics are being finalized:

```bash
cd contracts
clarinet check contracts/stream-core.clar
```

Project-wide checks with `clarinet check` require valid mnemonic values in Clarinet settings files.

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

## security sequencing

- mutating public functions perform principal authorization checks before writes.
- stream-id inputs are validated before stream map reads in mutating entrypoints.
- transfer helpers return Clarity response types and are propagated with try!.
