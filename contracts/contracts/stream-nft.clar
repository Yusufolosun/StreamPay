;; Contract: stream-nft
;; Version: v0.1.0
;; Purpose: SIP-009 receipt NFTs for StreamPay stream ownership.
;; Purpose: Mints one receipt per stream participant and keeps stream-core ownership in sync best-effort.
;; Author: <AUTHOR_NAME>
;; Deployment Date: <YYYY-MM-DD>
;; Implements: SIP-009
;; Dependencies: stream-core, stream-conditions
;; Security Notes:
;; - NFT ownership transfer is authoritative.
;; - stream-core sender sync is attempted after sender receipt transfers and ignored on failure.

(define-trait sip009-trait
	(
		(get-last-token-id () (response uint uint))
		(get-token-uri (token-id uint) (response (optional (string-ascii 256)) uint))
		(get-owner (token-id uint) (response (optional principal) uint))
		(transfer (token-id uint) (sender principal) (recipient principal) (response bool uint))
	)
)

(impl-trait .sip009-trait)

(define-constant STREAM-CORE-CONTRACT .stream-core)
(define-constant ZERO-PRINCIPAL 'SP000000000000000000002Q6VF78)
(define-constant TOKEN-URI-BASE "https://metadata.streampay.xyz/receipts/")
(define-constant SENDER-RECEIPT "SENDER")
(define-constant RECIPIENT-RECEIPT "RECIPIENT")

(define-constant err-not-authorised (err u1000))
(define-constant err-token-not-found (err u1001))
(define-constant err-invalid-receipt-type (err u1002))
(define-constant err-token-already-minted (err u1003))
(define-constant err-token-not-owner (err u1004))
(define-constant err-zero-address (err u1005))
(define-constant err-invalid-token-id (err u1006))

(define-data-var token-id-nonce uint u0)

(define-map token-owner
	{ token-id: uint }
	{ owner: principal }
)

(define-map token-metadata
	{ token-id: uint }
	{
		stream-id: uint,
		receipt-type: (string-ascii 9),
		minted-at: uint
	}
)

(define-map stream-receipts
	{ stream-id: uint }
	{
		sender-token-id: (optional uint),
		recipient-token-id: (optional uint)
	}
)

(define-map approved-operators
	{ owner: principal, operator: principal }
	{ approved: bool }
)

(define-private (is-valid-receipt-type (receipt-type (string-ascii 9)))
	(or (is-eq receipt-type SENDER-RECEIPT) (is-eq receipt-type RECIPIENT-RECEIPT))
)

(define-private (empty-stream-receipts)
	{ sender-token-id: none, recipient-token-id: none }
)

(define-private (get-stream-receipts (stream-id uint))
	(default-to (empty-stream-receipts) (map-get? stream-receipts { stream-id: stream-id }))
)

(define-private (stream-receipt-slot (receipt-type (string-ascii 9)) (receipt-record { sender-token-id: (optional uint), recipient-token-id: (optional uint) }))
	(if (is-eq receipt-type SENDER-RECEIPT)
		(get sender-token-id receipt-record)
		(get recipient-token-id receipt-record)
	)
)

(define-private (set-stream-receipt-slot
	(stream-id uint)
	(receipt-type (string-ascii 9))
	(token-id (optional uint))
)
	(let ((receipt-record (get-stream-receipts stream-id)))
		(map-set stream-receipts
			{ stream-id: stream-id }
			(if (is-eq receipt-type SENDER-RECEIPT)
				(merge receipt-record { sender-token-id: token-id })
				(merge receipt-record { recipient-token-id: token-id })
			)
		)
	)
)

(define-read-only (get-last-token-id)
	(ok (var-get token-id-nonce))
)

(define-read-only (get-token-uri (token-id uint))
	(match (map-get? token-metadata { token-id: token-id })
		metadata (ok (some (concat TOKEN-URI-BASE (to-string token-id))))
		(ok none)
	)
)

(define-read-only (get-owner (token-id uint))
	(match (map-get? token-owner { token-id: token-id })
		owner-record (ok (some (get owner owner-record)))
		(ok none)
	)
)

(define-read-only (get-stream-for-token (token-id uint))
	(ok (map-get? token-metadata { token-id: token-id }))
)

(define-read-only (get-tokens-for-stream (stream-id uint))
	(match (map-get? stream-receipts { stream-id: stream-id })
		receipt-record
			(match (get sender-token-id receipt-record)
				sender-token-id
					(match (get recipient-token-id receipt-record)
						recipient-token-id
							(if (is-eq sender-token-id recipient-token-id)
								(list sender-token-id)
								(list sender-token-id recipient-token-id)
							)
						(list sender-token-id)
					)
				(match (get recipient-token-id receipt-record)
					recipient-token-id (list recipient-token-id)
					(list)
				)
			)

		(define-public (mint-stream-receipt (stream-id uint) (stream-owner principal) (receipt-type (string-ascii 9)))
			(begin
				(asserts! (is-eq contract-caller STREAM-CORE-CONTRACT) err-not-authorised)
				(asserts! (> stream-id u0) err-invalid-token-id)
				(asserts! (not (is-eq stream-owner ZERO-PRINCIPAL)) err-zero-address)
				(asserts! (is-valid-receipt-type receipt-type) err-invalid-receipt-type)
				(let (
					(receipt-record (get-stream-receipts stream-id))
					(existing-token-id (stream-receipt-slot receipt-type receipt-record))
				)
					(begin
						(asserts! (is-none existing-token-id) err-token-already-minted)
						(let ((new-token-id (+ (var-get token-id-nonce) u1)))
							(begin
								(map-set token-owner
									{ token-id: new-token-id }
									{ owner: stream-owner }
								)
								(map-set token-metadata
									{ token-id: new-token-id }
									{
										stream-id: stream-id,
										receipt-type: receipt-type,
										minted-at: block-height
									}
								)
								(set-stream-receipt-slot stream-id receipt-type (some new-token-id))
								(var-set token-id-nonce new-token-id)
								(ok new-token-id)
							)
						)
					)

					(define-public (burn-stream-receipt (token-id uint))
						(let (
							(token-owner-record (unwrap! (map-get? token-owner { token-id: token-id }) err-token-not-found))
							(token-metadata-record (unwrap! (map-get? token-metadata { token-id: token-id }) err-token-not-found))
						)
							(begin
								(asserts!
									(or
										(is-eq tx-sender (get owner token-owner-record))
										(is-eq contract-caller STREAM-CORE-CONTRACT)
									)
									err-not-authorised
								)
								(map-delete token-owner { token-id: token-id })
								(map-delete token-metadata { token-id: token-id })
								(set-stream-receipt-slot
									(get stream-id token-metadata-record)
									(get receipt-type token-metadata-record)
									none
								)
								(ok true)
							)
						)
					)
				)
			)
		)
		(list)
	)
)
