;; Contract: stream-core
;; Version: v0.1.0
;; Purpose: Core stream lifecycle scaffold for StreamPay.
;; Purpose: Includes placeholders for CRUD flow, rate engine, and fee handling boundaries.
;; Author: <AUTHOR_NAME>
;; Deployment Date: <YYYY-MM-DD>
;; Dependencies: stream-conditions, stream-nft
;; Cross-contract call graph (mutating paths):
;; - stream-core -> stream-nft: mint-stream-receipt, burn-stream-receipt
;; - stream-conditions -> stream-core: get-stream, get-whitelisted-tokens
;; - stream-nft -> stream-core: transfer-stream-sender (best-effort)
;; Read-only dependency check:
;; - stream-conditions reads stream-core.
;; - stream-core read-only functions do not call stream-nft or stream-conditions.
;; - stream-nft performs a best-effort write call into stream-core.
;; Therefore read-only dependencies are acyclic.
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
(define-constant err-token-not-whitelisted (err u1018))
(define-constant err-token-transfer-failed (err u1019))
(define-constant err-fee-transfer-failed (err u1020))
(define-constant err-already-initialised (err u1021))

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
;; tradeoff: a single sender or recipient can hold at most 50 active stream references in this contract; once the cap is reached, users should close or cancel old streams before creating new ones.
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

;; Clarity cannot store a trait reference in a map and later dynamically dispatch to an arbitrary implementation.
;; The canonical pattern is to store the token contract principal, validate it up front, and pass that typed principal through each transfer path.
;; stores owner-approved SIP-010 token principals so stream creation can whitelist before transfer execution
(define-map token-whitelist principal bool)

;; FIRST post-deployment action: whitelist the deployed sBTC contract principal via the deploy script substitution.
;; Never hardcode a mainnet token address in source; always pass the contract principal in from deployment automation.

(define-public (whitelist-token (token-contract principal))
	(begin
		(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
		(asserts! (not (is-eq token-contract ZERO-PRINCIPAL)) err-zero-address)
		(map-set token-whitelist token-contract true)
		(ok true)
	)
)

(define-public (remove-token-from-whitelist (token-contract principal))
	(begin
		(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
		(asserts! (not (is-eq token-contract ZERO-PRINCIPAL)) err-zero-address)
		(map-delete token-whitelist token-contract)
		(ok true)
	)
)

;; EVENT SCHEMA FOR INDEXERS
;; Every state transition prints a tuple with these canonical fields:
;; - event-type: (string-ascii 32)
;; - stream-id: (optional uint)
;; - caller: principal
;; - block-height: uint
;; Additional event-specific amount fields are appended per event.
;; Required event names:
;; stream-created, stream-claimed, stream-paused, stream-resumed,
;; stream-cancelled, fee-updated, protocol-paused, protocol-resumed, fees-withdrawn.

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

(define-data-var stream-nft-contract principal ZERO-PRINCIPAL)

(define-public (initialize-stream-nft-contract (stream-nft principal))
	(begin
		(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
		(asserts! (not (is-eq stream-nft ZERO-PRINCIPAL)) err-zero-address)
		(asserts! (is-eq (var-get stream-nft-contract) ZERO-PRINCIPAL) err-already-initialised)
		(var-set stream-nft-contract stream-nft)
		(ok true)
	)
)

(define-private (transfer-funds (amount uint) (sender principal) (recipient principal) (token-contract (optional principal)))
	(if (is-eq amount u0)
		(ok true)
		(match token-contract
			;; SIP-010 stream path
			token
				err-token-transfer-failed
			;; STX stream path
			(stx-transfer? amount sender recipient)
		)
	)
)

(define-private (is-token-whitelisted (token-contract principal))
	(get-whitelisted-tokens token-contract)
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
			;; STX fees remain in-contract and are later withdrawable only by owner within invariant limits.
			(match token-contract
				token true
				true
			)
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
			(asserts! (is-none token-contract) err-token-not-whitelisted)
			(asserts! (> amount MIN-STREAM-AMOUNT) err-invalid-amount)
			(asserts! (> rate-per-block u0) err-invalid-rate)
			(asserts! (> duration-blocks u0) err-invalid-duration)
			(asserts! (<= duration-blocks MAX-STREAM-DURATION) err-invalid-duration)
			;; The cap is enforced on both reverse indexes so one overloaded wallet cannot grow either side beyond 50 active references.
			;; Recommended user action at cap: claim/cancel finished streams to free slots, then retry create-stream.
			(asserts! (< (len sender-stream-list) STREAM-LIST-CAP) err-too-many-streams)
			(asserts! (< (len recipient-stream-list) STREAM-LIST-CAP) err-too-many-streams)
			(try! (transfer-funds amount tx-sender contract-principal token-contract))
			(let (
				(fee-result (try! (collect-protocol-fee amount token-contract)))
				(deposit-amount (get net-amount fee-result))
				(new-stream-id (var-get stream-id-nonce))
				(end-block (+ block-height duration-blocks))
				;; If append would exceed 50 items, abort before mutating either index so the sender and recipient lists stay in sync.
				(updated-sender-streams (unwrap! (as-max-len? (append sender-stream-list new-stream-id) u50) err-too-many-streams))
				;; If append would exceed 50 items, abort before mutating either index so the sender and recipient lists stay in sync.
				(updated-recipient-streams (unwrap! (as-max-len? (append recipient-stream-list new-stream-id) u50) err-too-many-streams))
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
					(var-set stream-id-nonce (+ new-stream-id u1))
					(var-set total-volume-streamed (+ (var-get total-volume-streamed) deposit-amount))
					(print {
						event-type: "stream-created",
						stream-id: (some new-stream-id),
						caller: tx-sender,
						block-height: block-height,
						deposit-amount: deposit-amount,
						fee-amount: (get fee-amount fee-result)
					})
					(asserts! (is-some (map-get? streams { stream-id: new-stream-id })) err-stream-not-found)
					(asserts! (is-eq (var-get stream-id-nonce) (+ new-stream-id u1)) err-stream-not-found)
					(ok new-stream-id)
				)
			)
		)
	)
)

(define-public (claim-stream (stream-id uint))
	(begin
		(asserts! (>= stream-id u0) err-invalid-stream-id)
		(let (
			;; The stream record must exist before we can compute claimable amounts or transfer funds.
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			;; The balance checkpoint must exist or the claim math would use stale state.
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
						;; The stored token-contract determines whether this is the STX stream path or the SIP-010 stream path.
					(try! (as-contract (transfer-funds claimable-amount tx-sender (get recipient stream) (get token-contract stream))))
					(if (is-none (get token-contract stream))
						(var-set total-active-stx-deposits (- (var-get total-active-stx-deposits) claimable-amount))
						true
					)
					(map-set streams
						{ stream-id: stream-id }
						(merge stream { claimed-amount: updated-claimed })
					)
					(map-set stream-balances
						{ stream-id: stream-id }
						{ last-checkpoint-block: block-height, last-checkpoint-balance: u0 }
					)
					(print {
						event-type: "stream-claimed",
						stream-id: (some stream-id),
						caller: tx-sender,
						block-height: block-height,
						claimed-amount: claimable-amount
					})
					(ok claimable-amount)
				)
			)
			)
		)
	)
)

(define-public (pause-stream (stream-id uint))
	(begin
		(asserts! (not (var-get is-paused)) err-protocol-paused)
		(asserts! (>= stream-id u0) err-invalid-stream-id)
		(let (
			;; The stream record must exist before pausing so only live streams can transition.
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			;; The balance checkpoint must exist or the pause checkpoint cannot be derived safely.
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
					(print {
						event-type: "stream-paused",
						stream-id: (some stream-id),
						caller: tx-sender,
						block-height: block-height,
						checkpoint-balance: checkpoint-balance
					})
					(ok true)
				)
			)
			)
		)
	)
)

(define-public (resume-stream (stream-id uint))
	(begin
		(asserts! (not (var-get is-paused)) err-protocol-paused)
		(asserts! (>= stream-id u0) err-invalid-stream-id)
		(let (
			;; The stream record must exist before resuming so only live streams can transition.
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
			;; The balance checkpoint must exist or the resume checkpoint would be stale.
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
			(print {
				event-type: "stream-resumed",
				stream-id: (some stream-id),
				caller: tx-sender,
				block-height: block-height,
				checkpoint-balance: (get last-checkpoint-balance balance)
			})
			(ok true)
			)
		)
	)
)

(define-public (cancel-stream (stream-id uint))
	(begin
		;; Intentionally not guarded by `is-paused` so senders can always unwind risk.
		(asserts! (>= stream-id u0) err-invalid-stream-id)
		(let (
				;; The stream record must exist before cancellation so refunds are computed from canonical state.
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
				;; The balance checkpoint must exist or the refund split would be incorrect.
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
					;; The stored token-contract determines whether this is the STX stream path or the SIP-010 stream path.
					(try! (as-contract (transfer-funds recipient-paid tx-sender (get recipient stream) (get token-contract stream))))
					(try! (as-contract (transfer-funds sender-refunded tx-sender (get sender stream) (get token-contract stream))))
					(if (is-none (get token-contract stream))
						(var-set total-active-stx-deposits (- (var-get total-active-stx-deposits) (+ recipient-paid sender-refunded)))
						true
					)
					(map-set streams
						{ stream-id: stream-id }
						(merge stream { claimed-amount: updated-claimed, is-cancelled: true })
					)
					(map-set stream-balances
						{ stream-id: stream-id }
						{ last-checkpoint-block: block-height, last-checkpoint-balance: u0 }
					)
					(print {
						event-type: "stream-cancelled",
						stream-id: (some stream-id),
						caller: tx-sender,
						block-height: block-height,
						recipient-paid: recipient-paid,
						sender-refunded: sender-refunded
					})
					(ok { recipient-paid: recipient-paid, sender-refunded: sender-refunded })
				)
			)
			)
		)
	)
)

(define-public (transfer-stream-sender (stream-id uint) (new-sender principal))
	(begin
		(asserts! (>= stream-id u0) err-invalid-stream-id)
		(asserts! (not (is-eq (var-get stream-nft-contract) ZERO-PRINCIPAL)) err-not-authorised)
		(asserts! (is-eq contract-caller (var-get stream-nft-contract)) err-not-authorised)
		(asserts! (not (is-eq new-sender ZERO-PRINCIPAL)) err-zero-address)
		(let (
			;; The stream must exist because the NFT contract only forwards sender changes for persisted streams.
			(stream (unwrap! (map-get? streams { stream-id: stream-id }) err-stream-not-found))
		)
			(begin
				(map-set streams { stream-id: stream-id } (merge stream { sender: new-sender }))
				(print {
					event-type: "sender-transferred",
					stream-id: (some stream-id),
					caller: tx-sender,
					block-height: block-height,
					new-sender: new-sender
				})
				(ok true)
			)
		)
	)
)

(define-public (update-protocol-fee (new-fee-bps uint))
	(let ((old-fee (var-get protocol-fee-bps)))
		(begin
			(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
			(asserts! (<= new-fee-bps MAX-FEE-BPS) err-fee-too-high)
			(var-set protocol-fee-bps new-fee-bps)
			(print {
				event-type: "fee-updated",
				stream-id: none,
				caller: tx-sender,
				block-height: block-height,
				old-fee: old-fee,
				new-fee: new-fee-bps
			})
			(ok true)
		)
	)
)

(define-public (emergency-pause-protocol)
	(begin
		(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
		(var-set is-paused true)
		(print {
			event-type: "protocol-paused",
			stream-id: none,
			caller: tx-sender,
			block-height: block-height
		})
		(ok true)
	)
)

(define-public (emergency-resume-protocol)
	(begin
		(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
		(var-set is-paused false)
		(print {
			event-type: "protocol-resumed",
			stream-id: none,
			caller: tx-sender,
			block-height: block-height
		})
		(ok true)
	)
)

(define-public (withdraw-accumulated-fees (amount uint) (recipient principal))
	(let (
		(contract-balance (stx-get-balance (as-contract tx-sender)))
		(active-liabilities (var-get total-active-stx-deposits))
	)
		(begin
			(asserts! (is-eq tx-sender CONTRACT-OWNER) err-not-authorised)
			(asserts! (> amount u0) err-invalid-amount)
			(asserts! (not (is-eq recipient ZERO-PRINCIPAL)) err-zero-address)
			(asserts! (>= contract-balance active-liabilities) err-invalid-withdrawal)
			;; SECURITY-CRITICAL INVARIANT:
			;; `active-liabilities` represents all STX owed to non-cancelled stream participants.
			;; Only protocol fees are outside this liability set, so owner withdrawals must stay
			;; within `contract-balance - active-liabilities` to avoid stealing user deposits.
			(let ((withdrawable-fees (- contract-balance active-liabilities)))
				(begin
					(asserts! (<= amount withdrawable-fees) err-invalid-withdrawal)
					(try! (as-contract (stx-transfer? amount tx-sender recipient)))
					(print {
						event-type: "fees-withdrawn",
						stream-id: none,
						caller: tx-sender,
						block-height: block-height,
						amount: amount,
						recipient: recipient
					})
					(ok amount)
				)
			)
		)
	)
)

(define-read-only (get-stream (stream-id uint))
	(if (>= stream-id u0)
		(map-get? streams { stream-id: stream-id })
		none
	)
)

(define-read-only (get-whitelisted-tokens (token-contract principal))
	(default-to false (map-get? token-whitelist token-contract))
)

(define-read-only (get-claimable-balance (stream-id uint))
	(if (>= stream-id u0)
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
	(if (>= stream-id u0)
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

(define-read-only (get-total-active-stx-deposits)
	(var-get total-active-stx-deposits)
)

(define-read-only (get-withdrawable-fees)
	(let (
		(contract-balance (stx-get-balance (as-contract tx-sender)))
		(active-liabilities (var-get total-active-stx-deposits))
	)
		(if (>= contract-balance active-liabilities)
			(- contract-balance active-liabilities)
			u0
		)
	)
)
