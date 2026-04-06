;; StreamPay Core Contract
;; TODO: Implement payment stream functionality
;;
;; Core Features:
;; - Create payment streams with sender, recipient, amount, interval
;; - Claim accrued payments
;; - Cancel streams with pro-rata refund
;; - Pause and resume streams
;;
;; Security Considerations:
;; - Principal validation on all operations
;; - Arithmetic overflow protection
;; - Re-entrancy guards where needed

;; Error codes
(define-constant ERR_NOT_AUTHORIZED (err u1))
(define-constant ERR_STREAM_NOT_FOUND (err u2))
(define-constant ERR_INSUFFICIENT_BALANCE (err u3))
(define-constant ERR_STREAM_EXPIRED (err u4))
(define-constant ERR_STREAM_PAUSED (err u5))

;; TODO: Implement data maps and public functions
