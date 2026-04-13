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

(define-private (transfer-token (amount uint) (sender principal) (recipient principal) (token-contract (optional principal)))
	(if (is-eq amount u0)
		(ok true)
		(match token-contract
			token (contract-call? token transfer amount sender recipient none)
			(stx-transfer? amount sender recipient)
		)
	)
)

(define-public (create-milestone-stream
	(recipient principal)
	(total-amount uint)
	(milestones (list 10 {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	}))
	(arbiter (optional principal))
)
	(let (
		(contract-principal (as-contract tx-sender))
		(new-id (+ (var-get milestone-stream-id-nonce) u1))
		(total-bps (sum-milestone-bps milestones))
	)
		(begin
			(asserts! (> total-amount u0) err-invalid-total-amount)
			(asserts! (> (len milestones) u0) err-invalid-milestones)
			(asserts! (<= (len milestones) u10) err-invalid-milestones)
			(asserts! (all-labels-non-empty milestones) err-invalid-milestones)
			;; Critical invariant: the milestone basis-points sum must be exactly 10000.
			(asserts! (is-eq total-bps BPS-DENOMINATOR) err-invalid-milestones)
			(asserts!
				(match arbiter
					arb (and
						(is-arbiter-registered arb)
						(not (is-eq arb tx-sender))
						(not (is-eq arb recipient))
					)
					true
				)
				err-invalid-arbiter
			)
			(try! (transfer-token total-amount tx-sender contract-principal none))
			(map-set milestone-streams new-id {
				sender: tx-sender,
				recipient: recipient,
				arbiter: arbiter,
				total-amount: total-amount,
				token-contract: none,
				milestones: milestones,
				is-cancelled: false,
				created-at: block-height
			})
			(var-set milestone-stream-id-nonce new-id)
			(ok new-id)
		)
	)
)

(define-public (release-milestone (milestone-stream-id uint) (milestone-index uint))
	(let (
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
		(milestone (unwrap! (element-at? (get milestones stream) milestone-index) err-invalid-milestone-index))
		(dispute-active (is-dispute-active milestone-stream-id milestone-index))
		(caller-is-arbiter
			(match (get arbiter stream)
				arb (and dispute-active (is-eq tx-sender arb))
				false
			)
		)
		(release-amount (milestone-amount (get total-amount stream) milestone))
		(updated-milestone (merge milestone {
			is-released: true,
			released-at: (some block-height)
		}))
		(updated-milestones
			(unwrap! (replace-at? (get milestones stream) milestone-index updated-milestone) err-invalid-milestone-index)
		)
	)
		(begin
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (or (is-eq tx-sender (get sender stream)) caller-is-arbiter) err-not-authorized)
			(asserts! (not (get is-released milestone)) err-milestone-released)
			(try! (as-contract (transfer-token release-amount tx-sender (get recipient stream) (get token-contract stream))))
			(map-set milestone-streams milestone-stream-id (merge stream { milestones: updated-milestones }))
			(map-set disputes {
				milestone-stream-id: milestone-stream-id,
				milestone-index: milestone-index
			} {
				is-active: false
			})
			(ok release-amount)
		)
	)
)

(define-public (dispute-milestone (milestone-stream-id uint) (milestone-index uint))
	(let (
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
		(milestone (unwrap! (element-at? (get milestones stream) milestone-index) err-invalid-milestone-index))
	)
		(begin
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (is-eq tx-sender (get recipient stream)) err-not-authorized)
			(asserts! (is-some (get arbiter stream)) err-invalid-arbiter)
			(asserts! (not (get is-released milestone)) err-milestone-released)
			(map-set disputes {
				milestone-stream-id: milestone-stream-id,
				milestone-index: milestone-index
			} {
				is-active: true
			})
			(print {
				event-type: "dispute-raised",
				stream-id: milestone-stream-id,
				milestone-index: milestone-index,
				caller: tx-sender,
				block-height: block-height
			})
			(ok true)
		)
	)
)

(define-public (resolve-dispute (milestone-stream-id uint) (milestone-index uint) (release-to-recipient bool))
	(let (
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
		(milestone (unwrap! (element-at? (get milestones stream) milestone-index) err-invalid-milestone-index))
		(arbiter (unwrap! (get arbiter stream) err-invalid-arbiter))
		(dispute-active (is-dispute-active milestone-stream-id milestone-index))
		(amount (milestone-amount (get total-amount stream) milestone))
	)
		(begin
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (is-eq tx-sender arbiter) err-not-authorized)
			(asserts! (is-arbiter-registered arbiter) err-invalid-arbiter)
			(asserts! dispute-active err-dispute-not-active)
			(asserts! (not (get is-released milestone)) err-milestone-released)
			(ok amount)
		)
	)
)
