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

(define-map stream-balances
	{ stream-id: uint }
	{
		last-checkpoint-block: uint,
		last-checkpoint-balance: uint
	}
)

(define-map sender-streams
	{ sender: principal }
	{ stream-ids: (list 50 uint) }
)

(define-map recipient-streams
	{ recipient: principal }
	{ stream-ids: (list 50 uint) }
)

(define-data-var stream-id-nonce uint u0)
