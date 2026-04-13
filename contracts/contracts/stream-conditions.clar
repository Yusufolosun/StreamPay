;; Contract: stream-conditions
;; Version: v0.1.0
;; Purpose: Milestone-conditioned stream release and dispute resolution.
;; Dependencies: stream-core, stream-nft

(define-constant BPS-DENOMINATOR u10000)

(define-constant err-not-authorized (err u2000))
(define-constant err-stream-not-found (err u2001))
(define-constant err-invalid-total-amount (err u2002))
(define-constant err-invalid-milestones (err u2003))
(define-constant err-invalid-milestone-index (err u2004))
(define-constant err-milestone-released (err u2005))
(define-constant err-invalid-arbiter (err u2006))
(define-constant err-dispute-not-active (err u2007))
(define-constant err-dispute-active (err u2008))
(define-constant err-stream-cancelled (err u2009))

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

(define-map disputes {
	milestone-stream-id: uint,
	milestone-index: uint
} {
	is-active: bool
})

(define-data-var milestone-stream-id-nonce uint u0)

(define-private (sum-milestone-bps (milestones (list 10 {
	label: (string-ascii 64),
	basis-points: uint,
	is-released: bool,
	released-at: (optional uint)
})))
	(fold
		(lambda (milestone acc)
			(+ acc (get basis-points milestone))
		)
		milestones
		u0
	)
)

(define-private (all-labels-non-empty (milestones (list 10 {
	label: (string-ascii 64),
	basis-points: uint,
	is-released: bool,
	released-at: (optional uint)
})))
	(fold
		(lambda (milestone ok-so-far)
			(and ok-so-far (> (len (get label milestone)) u0))
		)
		milestones
		true
	)
)

(define-private (is-arbiter-registered (arbiter principal))
	(match (map-get? arbiter-registry arbiter)
		entry (get is-registered entry)
		false
	)
)

(define-private (is-dispute-active (milestone-stream-id uint) (milestone-index uint))
	(match (map-get? disputes {
		milestone-stream-id: milestone-stream-id,
		milestone-index: milestone-index
	})
		entry (get is-active entry)
		false
	)
)

(define-private (milestone-amount (total-amount uint) (milestone {
	label: (string-ascii 64),
	basis-points: uint,
	is-released: bool,
	released-at: (optional uint)
}))
	(/ (* total-amount (get basis-points milestone)) BPS-DENOMINATOR)
)

(define-private (has-any-active-dispute (milestone-stream-id uint))
	(or
		(is-dispute-active milestone-stream-id u0)
		(is-dispute-active milestone-stream-id u1)
		(is-dispute-active milestone-stream-id u2)
		(is-dispute-active milestone-stream-id u3)
		(is-dispute-active milestone-stream-id u4)
		(is-dispute-active milestone-stream-id u5)
		(is-dispute-active milestone-stream-id u6)
		(is-dispute-active milestone-stream-id u7)
		(is-dispute-active milestone-stream-id u8)
		(is-dispute-active milestone-stream-id u9)
	)
)
