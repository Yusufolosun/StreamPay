;; Contract: stream-conditions
;; Version: v0.1.0
;; Purpose: Milestone-conditioned stream release and dispute resolution.
;; Dependencies: stream-core, stream-nft
;; Cross-contract call graph (mutating paths):
;; - stream-core -> stream-nft: mint-stream-receipt, burn-stream-receipt
;; - stream-conditions -> stream-core: get-stream, get-whitelisted-tokens
;; - stream-nft -> stream-core: transfer-stream-sender (best-effort)
;; Read-only dependency check:
;; - stream-conditions reads stream-core.
;; - stream-core read-only functions do not call stream-nft or stream-conditions.
;; - stream-nft performs a best-effort write call into stream-core.
;; Therefore read-only dependencies are acyclic.

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
(define-constant err-token-not-whitelisted (err u2010))
(define-constant err-whitelist-check-failed (err u2011))
(define-constant err-token-transfer-failed (err u2012))

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

(define-private (sum-milestone-bps-step
	(milestone {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	})
	(acc uint)
)
	(+ acc (get basis-points milestone))
)

(define-private (all-labels-non-empty-step
	(milestone {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	})
	(ok-so-far bool)
)
	(and ok-so-far (has-valid-milestone-label (get label milestone)))
)

;; CRITICAL INVARIANT
;; The sum of all milestone basis-points must equal exactly 10000.
;; This is enforced with asserts! in create-milestone-stream so failures always abort.

(define-private (sum-milestone-bps (milestones (list 10 {
	label: (string-ascii 64),
	basis-points: uint,
	is-released: bool,
	released-at: (optional uint)
})))
	(fold sum-milestone-bps-step milestones u0)
)

(define-private (has-valid-milestone-label (label (string-ascii 64)))
	(and (> (len label) u0) (<= (len label) u64))
)

(define-private (all-labels-non-empty (milestones (list 10 {
	label: (string-ascii 64),
	basis-points: uint,
	is-released: bool,
	released-at: (optional uint)
})))
	(fold all-labels-non-empty-step milestones true)
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

(define-private (is-token-whitelisted (token-contract principal))
	;; The whitelist check can only succeed if stream-core is deployed and callable at the configured contract principal.
	;; If the dependency is missing or misconfigured, fail closed instead of assuming the token is allowed.
	(contract-call? .stream-core get-whitelisted-tokens token-contract)
)

(define-private (milestone-amount (total-amount uint) (milestone {
	label: (string-ascii 64),
	basis-points: uint,
	is-released: bool,
	released-at: (optional uint)
}))
	(/ (* total-amount (get basis-points milestone)) BPS-DENOMINATOR)
)

(define-private (sum-base-amounts-except-last-step
	(milestone {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	})
	(acc {
		total-amount: uint,
		last-index: uint,
		current-index: uint,
		sum: uint
	})
)
	(let (
		(current-index (get current-index acc))
		(base-amount (milestone-amount (get total-amount acc) milestone))
	)
		(if (is-eq current-index (get last-index acc))
			(merge acc { current-index: (+ current-index u1) })
			(merge acc {
				current-index: (+ current-index u1),
				sum: (+ (get sum acc) base-amount)
			})
		)
	)
)

(define-private (milestone-amount-at-index
	(total-amount uint)
	(milestones (list 10 {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	}))
	(milestone-index uint)
	(milestone {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	})
)
	(let (
		(last-index (- (len milestones) u1))
	)
		(if (is-eq milestone-index last-index)
			(let (
				(base-sum-acc
					(fold sum-base-amounts-except-last-step milestones {
						total-amount: total-amount,
						last-index: last-index,
						current-index: u0,
						sum: u0
					})
				)
			)
				(- total-amount (get sum base-sum-acc))
			)
			(milestone-amount total-amount milestone)
		)
	)
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
			;; SIP-010 stream path
			token err-token-transfer-failed
			;; STX stream path
			(stx-transfer? amount sender recipient)
		)
	)
)

(define-public (register-arbiter (stake-amount uint))
	(begin
		(map-set arbiter-registry tx-sender {
			is-registered: true,
			total-disputes: u0,
			stake-amount: stake-amount
		})
		(ok true)
	)
)

(define-public (update-arbiter-stake (stake-amount uint))
	(let (
		;; The arbiter must already exist in the registry before its stake can be updated.
		(entry (unwrap! (map-get? arbiter-registry tx-sender) err-invalid-arbiter))
	)
		(begin
			(asserts! (get is-registered entry) err-invalid-arbiter)
			(map-set arbiter-registry tx-sender {
				is-registered: true,
				total-disputes: (get total-disputes entry),
				stake-amount: stake-amount
			})
			(ok true)
		)
	)
)

(define-public (create-milestone-stream
	(recipient principal)
	(total-amount uint)
	(token-contract (optional principal))
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
			;; Every milestone label must be present and bounded so empty or oversized labels fail before any transfer occurs.
			(asserts! (all-labels-non-empty milestones) err-invalid-milestones)
			;; Critical invariant:
			;; sum(milestone basis-points) == 10000
			;; Enforced with asserts! so invalid plans always abort atomically.
			(asserts! (is-eq total-bps BPS-DENOMINATOR) err-invalid-milestones)
			(asserts! (is-none token-contract) err-token-not-whitelisted)
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
			(try! (transfer-token total-amount tx-sender contract-principal token-contract))
			(map-set milestone-streams new-id {
				sender: tx-sender,
				recipient: recipient,
				arbiter: arbiter,
				total-amount: total-amount,
				token-contract: token-contract,
				milestones: milestones,
				is-cancelled: false,
				created-at: block-height
			})
			(var-set milestone-stream-id-nonce new-id)
			(ok new-id)
		)
	)
)

(define-private (sum-unreleased-refund-step
	(milestone {
		label: (string-ascii 64),
		basis-points: uint,
		is-released: bool,
		released-at: (optional uint)
	})
	(acc {
		total-amount: uint,
		refunded: uint,
		current-index: uint,
		milestones: (list 10 {
			label: (string-ascii 64),
			basis-points: uint,
			is-released: bool,
			released-at: (optional uint)
		})
	})
)
	(let (
		(current-index (get current-index acc))
		(milestone-value (milestone-amount-at-index (get total-amount acc) (get milestones acc) current-index milestone))
	)
		(if (get is-released milestone)
			(merge acc { current-index: (+ current-index u1) })
			(merge acc {
				current-index: (+ current-index u1),
				refunded: (+ (get refunded acc) milestone-value)
			})
		)
	)
)

(define-public (release-milestone (milestone-stream-id uint) (milestone-index uint))
	(let (
			;; The milestone stream must exist or there is no canonical state to release from.
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
			;; The milestone index must resolve inside the stored milestone list for this stream.
		(milestone (unwrap! (element-at? (get milestones stream) milestone-index) err-invalid-milestone-index))
		(dispute-active (is-dispute-active milestone-stream-id milestone-index))
		(caller-is-arbiter
			(match (get arbiter stream)
				arb (and dispute-active (is-eq tx-sender arb))
				false
			)
		)
		(release-amount (milestone-amount-at-index (get total-amount stream) (get milestones stream) milestone-index milestone))
		(updated-milestone (merge milestone {
			is-released: true,
			released-at: (some block-height)
		}))
		(updated-milestones
				;; The milestone list must accept a replacement at the requested index or the stream state is inconsistent.
			(unwrap! (replace-at? (get milestones stream) milestone-index updated-milestone) err-invalid-milestone-index)
		)
	)
		(begin
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (or (is-eq tx-sender (get sender stream)) caller-is-arbiter) err-not-authorized)
			(asserts! (not (get is-released milestone)) err-milestone-released)
			;; The stored token-contract determines whether this is the STX stream path or the SIP-010 stream path.
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
			;; The milestone stream must exist or there is no canonical state to dispute.
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
			;; The milestone index must resolve inside the stored milestone list for this stream.
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
			;; The milestone stream must exist or there is no canonical state to resolve.
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
			;; The milestone index must resolve inside the stored milestone list for this stream.
		(milestone (unwrap! (element-at? (get milestones stream) milestone-index) err-invalid-milestone-index))
			;; The arbiter must be configured on the stream before the dispute can be resolved.
		(arbiter (unwrap! (get arbiter stream) err-invalid-arbiter))
		(dispute-active (is-dispute-active milestone-stream-id milestone-index))
		(amount (milestone-amount-at-index (get total-amount stream) (get milestones stream) milestone-index milestone))
		(destination (if release-to-recipient (get recipient stream) (get sender stream)))
		(updated-milestone (merge milestone {
			is-released: true,
			released-at: (some block-height)
		}))
		(updated-milestones
				;; The milestone list must accept a replacement at the requested index or the stream state is inconsistent.
			(unwrap! (replace-at? (get milestones stream) milestone-index updated-milestone) err-invalid-milestone-index)
		)
			;; The arbiter registry entry must exist so the dispute counter can be updated safely.
			(arbiter-entry (unwrap! (map-get? arbiter-registry arbiter) err-invalid-arbiter))
	)
		(begin
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (is-eq tx-sender arbiter) err-not-authorized)
			(asserts! (is-arbiter-registered arbiter) err-invalid-arbiter)
			(asserts! dispute-active err-dispute-not-active)
			(asserts! (not (get is-released milestone)) err-milestone-released)
			;; The stored token-contract determines whether this is the STX stream path or the SIP-010 stream path.
			(try! (as-contract (transfer-token amount tx-sender destination (get token-contract stream))))
			(map-set milestone-streams milestone-stream-id (merge stream { milestones: updated-milestones }))
			(map-set disputes {
				milestone-stream-id: milestone-stream-id,
				milestone-index: milestone-index
			} {
				is-active: false
			})
			(map-set arbiter-registry arbiter {
				is-registered: (get is-registered arbiter-entry),
				total-disputes: (+ (get total-disputes arbiter-entry) u1),
				stake-amount: (get stake-amount arbiter-entry)
			})
			(ok amount)
		)
	)
)

(define-public (cancel-milestone-stream (milestone-stream-id uint))
	(let (
			;; The milestone stream must exist or there is no canonical state to cancel.
		(stream (unwrap! (map-get? milestone-streams milestone-stream-id) err-stream-not-found))
		(refund-acc
			(fold
				sum-unreleased-refund-step
				(get milestones stream)
				{
					total-amount: (get total-amount stream),
					refunded: u0,
					current-index: u0,
					milestones: (get milestones stream)
				}
			)
		)
		(total-refunded
			(get refunded refund-acc)
		)
	)
		(begin
			(asserts! (not (get is-cancelled stream)) err-stream-cancelled)
			(asserts! (is-eq tx-sender (get sender stream)) err-not-authorized)
			(asserts! (not (has-any-active-dispute milestone-stream-id)) err-dispute-active)
			;; The stored token-contract determines whether this is the STX stream path or the SIP-010 stream path.
			(try! (as-contract (transfer-token total-refunded tx-sender (get sender stream) (get token-contract stream))))
			(map-set milestone-streams milestone-stream-id (merge stream { is-cancelled: true }))
			(ok total-refunded)
		)
	)
)

(define-read-only (get-milestone-stream (milestone-stream-id uint))
	(map-get? milestone-streams milestone-stream-id)
)

(define-read-only (get-arbiter (arbiter principal))
	(map-get? arbiter-registry arbiter)
)

(define-read-only (get-dispute (milestone-stream-id uint) (milestone-index uint))
	(map-get? disputes {
		milestone-stream-id: milestone-stream-id,
		milestone-index: milestone-index
	})
)

(define-read-only (get-milestone-stream-id-nonce)
	(var-get milestone-stream-id-nonce)
)
