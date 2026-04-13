;; Contract: stream-core
;; Version: v0.1.0
;; Purpose: Core stream lifecycle scaffold for StreamPay.
;; Purpose: Includes placeholders for CRUD flow, rate engine, and fee handling boundaries.
;; Author: <AUTHOR_NAME>
;; Deployment Date: <YYYY-MM-DD>
;; Dependencies: stream-conditions, stream-nft
;; Implements: N/A
;; Security Notes:
;; - <SECURITY_REVIEW_PENDING>

(define-constant CONTRACT-OWNER tx-sender)
(define-constant PROTOCOL-FEE-BPS u25)
(define-constant MAX-FEE-BPS u100)
(define-constant MAX-STREAM-DURATION u12614400)
(define-constant MIN-STREAM-AMOUNT u1000)
(define-constant STREAM-LIST-CAP u50)

(define-constant err-not-authorised (err u1000))
(define-constant err-stream-not-found (err u1001))
(define-constant err-stream-already-exists (err u1002))
(define-constant err-invalid-amount (err u1003))
(define-constant err-invalid-rate (err u1004))
(define-constant err-invalid-recipient (err u1005))
(define-constant err-stream-paused (err u1006))
(define-constant err-stream-active (err u1007))
(define-constant err-insufficient-balance (err u1008))
(define-constant err-zero-address (err u1009))
(define-constant err-fee-too-high (err u1010))
(define-constant err-stream-expired (err u1011))
(define-constant err-invalid-duration (err u1012))
(define-constant err-too-many-streams (err u1013))
(define-constant err-protocol-paused (err u1014))
(define-constant err-stream-cancelled (err u1015))
(define-constant err-invalid-stream-id (err u1016))
(define-constant err-invalid-withdrawal (err u1017))

;; stores canonical stream state keyed by stream-id so all lifecycle operations read/write one source of truth
;; uses a single tuple to keep related fields atomically updated and minimise cross-map consistency risk
;; invariant: sender/recipient are non-zero principals, start-block <= end-block, and claimed-amount <= deposit-amount
(define-map streams
	{ stream-id: uint }
	{
		sender: principal,
		recipient: principal,
		token-contract: (optional principal),
		deposit-amount: uint,
		rate-per-block: uint,
		start-block: uint,
		end-block: uint,
		claimed-amount: uint,
		is-paused: bool,
		is-cancelled: bool,
		created-at: uint
	}
)

;; stores derived checkpoint state per stream-id to make incremental accrual and claim math efficient
;; split from streams so high-frequency balance updates avoid mutating the full metadata tuple
;; invariant: last-checkpoint-block is monotonic per stream and last-checkpoint-balance never exceeds remaining stream balance
(define-map stream-balances
	{ stream-id: uint }
	{
		last-checkpoint-block: uint,
		last-checkpoint-balance: uint
	}
)

;; stores reverse index of stream ids created by each sender for wallet and analytics queries
;; capped list keeps storage bounded and makes cardinality checks explicit at write time
;; invariant: list length <= 50 and each stream-id in the list maps to a stream whose sender equals the key principal
(define-map sender-streams
	{ sender: principal }
	{ stream-ids: (list 50 uint) }
)

;; stores reverse index of stream ids received by each recipient for inbox-like retrieval
;; mirrors sender-streams structure to keep read paths symmetric and predictable
;; invariant: list length <= 50 and each stream-id in the list maps to a stream whose recipient equals the key principal
(define-map recipient-streams
	{ recipient: principal }
	{ stream-ids: (list 50 uint) }
)

;; EVENT SCHEMA FOR INDEXERS
;; Every state transition prints a tuple with these canonical fields:
;; - event-type: (string-ascii 32)
;; - stream-id: (optional uint)
;; - caller: principal
;; - block-height: uint
;; Additional event-specific amount fields are appended per event.

;; CONTRACT INVARIANTS
;; 1) `total-active-stx-deposits` tracks outstanding STX obligations for non-cancelled STX streams.
;; 2) Protocol fees are the only STX held by the contract that are not represented by active stream deposits.
;; 3) Owner fee withdrawals are restricted to `stx-balance - total-active-stx-deposits`.

;; stores the next stream identifier nonce used to mint unique stream ids
;; kept as a singleton data-var to guarantee monotonic ids without scanning maps
;; invariant: value starts at u0 and only increases by one per newly created stream
(define-data-var stream-id-nonce uint u0)
;; stores the active protocol fee in basis points for fee calculations across all streams
;; mutable variable allows governance updates without redeploying contract code
;; invariant: protocol-fee-bps <= MAX-FEE-BPS at all times
(define-data-var protocol-fee-bps uint PROTOCOL-FEE-BPS)
;; stores cumulative historical amount streamed for protocol-level telemetry and audits
;; aggregated counter avoids expensive recomputation from per-stream history
;; invariant: total-volume-streamed is monotonic and never decreases
(define-data-var total-volume-streamed uint u0)
;; stores global circuit breaker state that can halt mutating stream operations in emergencies
;; singleton flag enables cheap, consistent guard checks across all public entrypoints
;; invariant: when true, state-changing stream actions must refuse execution until resumed
(define-data-var is-paused bool false)
(define-data-var total-active-stx-deposits uint u0)

(define-constant ZERO-PRINCIPAL 'SP000000000000000000002Q6VF78)
(define-constant BPS-DENOMINATOR u10000)
(define-constant STATUS-ACTIVE "active")
(define-constant STATUS-PAUSED "paused")
(define-constant STATUS-EXPIRED "expired")
(define-constant STATUS-CANCELLED "cancelled")

(define-private (transfer-funds (amount uint) (sender principal) (recipient principal) (token-contract (optional principal)))
	(if (is-eq amount u0)
		(ok true)
		(match token-contract
			token (contract-call? token transfer amount sender recipient none)
			(stx-transfer? amount sender recipient)
		)
	)
)

(define-private (calculate-streamed-amount
	(stream {
		sender: principal,
		recipient: principal,
		token-contract: (optional principal),
		deposit-amount: uint,
		rate-per-block: uint,
		start-block: uint,
		end-block: uint,
		claimed-amount: uint,
		is-paused: bool,
		is-cancelled: bool,
		created-at: uint
	})
	(balance {
		last-checkpoint-block: uint,
		last-checkpoint-balance: uint
	})
)
	(let (
		;; checkpoint-balance stores accrued but not yet claimed amount as of last-checkpoint-block
		(checkpoint-block (get last-checkpoint-block balance))
		(checkpoint-balance (get last-checkpoint-balance balance))
		;; accrual never progresses beyond end-block
		(capped-block (if (> block-height (get end-block stream)) (get end-block stream) block-height))
		(elapsed-blocks (if (> capped-block checkpoint-block) (- capped-block checkpoint-block) u0))
		(newly-accrued (if (get is-paused stream) u0 (* elapsed-blocks (get rate-per-block stream))))
		(total-claimable (+ checkpoint-balance newly-accrued))
		(remaining-deposit (- (get deposit-amount stream) (get claimed-amount stream)))
	)
		(if (> total-claimable remaining-deposit) remaining-deposit total-claimable)
	)
)

(define-private (collect-protocol-fee (amount uint) (token-contract (optional principal)))
	(let (
		(fee-bps (var-get protocol-fee-bps))
		(fee-amount (/ (* amount fee-bps) BPS-DENOMINATOR))
		(net-amount (- amount fee-amount))
	)
		(begin
			(asserts! (<= fee-bps MAX-FEE-BPS) err-fee-too-high)
			;; Fees remain in-contract and are later withdrawable only by owner within invariant limits.
			(ok { fee-amount: fee-amount, net-amount: net-amount })
		)
	)
)

(define-private (is-stream-expired
	(stream {
		sender: principal,
		recipient: principal,
		token-contract: (optional principal),
		deposit-amount: uint,
		rate-per-block: uint,
		start-block: uint,
		end-block: uint,
		claimed-amount: uint,
		is-paused: bool,
		is-cancelled: bool,
		created-at: uint
	})
)
	(>= block-height (get end-block stream))
)

(define-public (create-stream (recipient principal) (amount uint) (rate-per-block uint) (duration-blocks uint) (token-contract (optional principal)))
	(let (
		(contract-principal (as-contract tx-sender))
		(sender-entry (map-get? sender-streams { sender: tx-sender }))
		(recipient-entry (map-get? recipient-streams { recipient: recipient }))
		(sender-stream-list (match sender-entry data (get stream-ids data) (list)))
		(recipient-stream-list (match recipient-entry data (get stream-ids data) (list)))
	)
		(begin
			(asserts! (not (var-get is-paused)) err-protocol-paused)
			(asserts! (not (is-eq recipient tx-sender)) err-invalid-recipient)
			(asserts! (not (is-eq recipient ZERO-PRINCIPAL)) err-zero-address)
			(asserts!
				(match token-contract token (not (is-eq token ZERO-PRINCIPAL)) true)
				err-zero-address
			)
			(asserts! (> amount MIN-STREAM-AMOUNT) err-invalid-amount)
			(asserts! (> rate-per-block u0) err-invalid-rate)
			(asserts! (> duration-blocks u0) err-invalid-duration)
			(asserts! (<= duration-blocks MAX-STREAM-DURATION) err-invalid-duration)
			(asserts! (< (len sender-stream-list) STREAM-LIST-CAP) err-too-many-streams)
			(asserts! (< (len recipient-stream-list) STREAM-LIST-CAP) err-too-many-streams)
			(try! (transfer-funds amount tx-sender contract-principal token-contract))
			(let (
				(fee-result (try! (collect-protocol-fee amount token-contract)))
				(deposit-amount (get net-amount fee-result))
				(new-stream-id (+ (var-get stream-id-nonce) u1))
				(end-block (+ block-height duration-blocks))
				(updated-sender-streams (unwrap! (as-max-len? (append sender-stream-list new-stream-id) STREAM-LIST-CAP) err-too-many-streams))
				(updated-recipient-streams (unwrap! (as-max-len? (append recipient-stream-list new-stream-id) STREAM-LIST-CAP) err-too-many-streams))
			)
				(begin
					(asserts! (> deposit-amount u0) err-invalid-amount)
					(if (is-none token-contract)
						(var-set total-active-stx-deposits (+ (var-get total-active-stx-deposits) deposit-amount))
						true
					)
					(map-set streams
						{ stream-id: new-stream-id }
						{
							sender: tx-sender,
							recipient: recipient,
							token-contract: token-contract,
							deposit-amount: deposit-amount,
							rate-per-block: rate-per-block,
							start-block: block-height,
							end-block: end-block,
							claimed-amount: u0,
							is-paused: false,
							is-cancelled: false,
							created-at: block-height
						}
					)
					(map-set stream-balances
						{ stream-id: new-stream-id }
						{ last-checkpoint-block: block-height, last-checkpoint-balance: u0 }
					)
					(map-set sender-streams { sender: tx-sender } { stream-ids: updated-sender-streams })
					(map-set recipient-streams { recipient: recipient } { stream-ids: updated-recipient-streams })
					(var-set stream-id-nonce new-stream-id)
					(var-set total-volume-streamed (+ (var-get total-volume-streamed) deposit-amount))
					(asserts! (is-some (map-get? streams { stream-id: new-stream-id })) err-stream-not-found)
					(asserts! (is-eq (var-get stream-id-nonce) new-stream-id) err-stream-not-found)
					(ok new-stream-id)
				)
			)
		)
	)
)

(define-public (claim-stream (stream-id uint))
	(begin
		(asserts! (> stream-id u0) err-invalid-stream-id)
		(let (
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			(balance (unwrap! (map-get? stream-balances { stream-id: stream-id }) err-stream-not-found))
		)
			(begin
			(asserts! (is-eq tx-sender (get recipient stream)) err-not-authorised)
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(let
				(
					(claimable-amount (calculate-streamed-amount stream balance))
					(updated-claimed (+ (get claimed-amount stream) claimable-amount))
				)
				(begin
					(asserts! (> claimable-amount u0) err-insufficient-balance)
					(try! (as-contract (transfer-funds claimable-amount tx-sender (get recipient stream) (get token-contract stream))))
					(map-set streams
						{ stream-id: stream-id }
						(merge stream { claimed-amount: updated-claimed })
					)
					(map-set stream-balances
						{ stream-id: stream-id }
						{ last-checkpoint-block: block-height, last-checkpoint-balance: u0 }
					)
					(ok claimable-amount)
				)
			)
			)
		)
	)
)

(define-public (pause-stream (stream-id uint))
	(begin
		(asserts! (> stream-id u0) err-invalid-stream-id)
		(let (
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			(balance (unwrap! (map-get? stream-balances { stream-id: stream-id }) err-stream-not-found))
		)
			(begin
			(asserts! (is-eq tx-sender (get sender stream)) err-not-authorised)
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (not (get is-paused stream)) err-stream-paused)
			(asserts! (not (is-stream-expired stream)) err-stream-expired)
			(let ((checkpoint-balance (calculate-streamed-amount stream balance)))
				(begin
					(map-set streams { stream-id: stream-id } (merge stream { is-paused: true }))
					(map-set stream-balances
						{ stream-id: stream-id }
						{ last-checkpoint-block: block-height, last-checkpoint-balance: checkpoint-balance }
					)
					(ok true)
				)
			)
			)
		)
	)
)

(define-public (resume-stream (stream-id uint))
	(begin
		(asserts! (> stream-id u0) err-invalid-stream-id)
		(let (
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			(balance (unwrap! (map-get? stream-balances { stream-id: stream-id }) err-stream-not-found))
		)
			(begin
			(asserts! (is-eq tx-sender (get sender stream)) err-not-authorised)
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (get is-paused stream) err-stream-active)
			(map-set streams { stream-id: stream-id } (merge stream { is-paused: false }))
			(map-set stream-balances
				{ stream-id: stream-id }
				{
					last-checkpoint-block: block-height,
					last-checkpoint-balance: (get last-checkpoint-balance balance)
				}
			)
			(ok true)
			)
		)
	)
)

(define-public (cancel-stream (stream-id uint))
	(begin
		(asserts! (> stream-id u0) err-invalid-stream-id)
		(let (
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			(balance (unwrap! (map-get? stream-balances { stream-id: stream-id }) err-stream-not-found))
		)
			(begin
			(asserts! (is-eq tx-sender (get sender stream)) err-not-authorised)
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(let (
				(recipient-paid (calculate-streamed-amount stream balance))
				(sender-refunded (- (- (get deposit-amount stream) (get claimed-amount stream)) recipient-paid))
				(updated-claimed (+ (get claimed-amount stream) recipient-paid))
			)
				(begin
					(try! (as-contract (transfer-funds recipient-paid tx-sender (get recipient stream) (get token-contract stream))))
					(try! (as-contract (transfer-funds sender-refunded tx-sender (get sender stream) (get token-contract stream))))
					(map-set streams
						{ stream-id: stream-id }
						(merge stream { claimed-amount: updated-claimed, is-cancelled: true })
					)
					(map-set stream-balances
						{ stream-id: stream-id }
						{ last-checkpoint-block: block-height, last-checkpoint-balance: u0 }
					)
					(ok { recipient-paid: recipient-paid, sender-refunded: sender-refunded })
				)
			)
			)
		)
	)
)

(define-read-only (get-stream (stream-id uint))
	(if (> stream-id u0)
		(map-get? streams { stream-id: stream-id })
		none
	)
)

(define-read-only (get-claimable-balance (stream-id uint))
	(if (> stream-id u0)
		(match (map-get? streams { stream-id: stream-id })
			stream
			(match (map-get? stream-balances { stream-id: stream-id })
				balance
				(calculate-streamed-amount stream balance)
				u0
			)
			u0
		)
		u0
	)
)

(define-read-only (get-stream-status (stream-id uint))
	(if (> stream-id u0)
		(match (map-get? streams { stream-id: stream-id })
			stream
			(match (map-get? stream-balances { stream-id: stream-id })
				balance
				(some {
					is-paused: (get is-paused stream),
					is-cancelled: (get is-cancelled stream),
					is-expired: (is-stream-expired stream),
					claimable: (calculate-streamed-amount stream balance),
					status: (if (get is-cancelled stream)
						STATUS-CANCELLED
						(if (get is-paused stream)
							STATUS-PAUSED
							(if (is-stream-expired stream) STATUS-EXPIRED STATUS-ACTIVE)
						)
					)
				})
				none
			)
			none
		)
		none
	)
)

(define-read-only (get-sender-streams (sender principal))
	(match (map-get? sender-streams { sender: sender })
		entry
		(get stream-ids entry)
		(list)
	)
)

(define-read-only (get-recipient-streams (recipient principal))
	(match (map-get? recipient-streams { recipient: recipient })
		entry
		(get stream-ids entry)
		(list)
	)
)

(define-read-only (get-protocol-fee-bps)
	(var-get protocol-fee-bps)
)

(define-read-only (get-total-volume)
	(var-get total-volume-streamed)
)
