# contracts

Clarinet smart-contract workspace scaffold for StreamPay.

## stream-core function coverage

Implemented public functions:
- create-stream
- claim-stream
- pause-stream
- resume-stream
- cancel-stream

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

## key error responses

- err-invalid-recipient: recipient cannot equal sender.
- err-zero-address: recipient and optional token contract must not be zero principal.
- err-invalid-amount: stream amount must be above minimum and net deposit must remain positive.
- err-too-many-streams: sender or recipient stream index reached 50-item cap.
- err-not-authorised: caller is not permitted for the requested stream action.
