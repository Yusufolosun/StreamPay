;; Contract: stream-conditions
;; Version: v0.1.0
;; Purpose: Milestone-conditioned stream release and dispute resolution.
;; Dependencies: stream-core, stream-nft

(define-constant BPS-DENOMINATOR u10000)

(define-map milestone-streams uint {
	sender: principal,
	recipient: principal,
	arbiter: (optional principal),
	total-amount: uint,
	token-contract: (optional principal),
	milestones: (list 10 {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	}),
	is-cancelled: bool,
	created-at: uint
})

(define-map arbiter-registry principal {
	is-registered: bool,
	total-disputes: uint,
	stake-amount: uint
})
