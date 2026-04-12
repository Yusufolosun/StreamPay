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

(define-map recipient-streams
	{ recipient: principal }
	{ stream-ids: (list 50 uint) }
)

(define-data-var stream-id-nonce uint u0)
(define-data-var protocol-fee-bps uint PROTOCOL-FEE-BPS)
(define-data-var total-volume-streamed uint u0)
(define-data-var is-paused bool false)
