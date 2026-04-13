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
