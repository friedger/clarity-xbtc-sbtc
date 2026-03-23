
(define-read-only (can-test-transfer
    (amount uint)
    (recipient principal)
    (memo (optional (string-ascii 100)))
  )
  (let ((sender-initial-balance (ft-get-balance swapping-xbtc tx-sender)))
    (and
      (>= sender-initial-balance amount)
      (> amount u0)
      (not (is-eq recipient tx-sender))
    )
  )
)

(define-public (test-transfer
    (amount uint)
    (recipient principal)
    (memo (optional (string-ascii 100)))
  )
  (let (
      (sender-initial-balance (ft-get-balance swapping-xbtc tx-sender))
      (recipient-initial-balance (ft-get-balance swapping-xbtc recipient))
    )
    (asserts! (>= sender-initial-balance amount) (ok true))
    (asserts! (> amount u0) (ok true))
    (try! (ft-transfer? swapping-xbtc amount tx-sender recipient))
    (asserts!
      (is-eq (ft-get-balance swapping-xbtc tx-sender)
        (- sender-initial-balance amount)
      )
      (err u9998)
    )
    (asserts!
      (is-eq (ft-get-balance swapping-xbtc recipient)
        (+ recipient-initial-balance amount)
      )
      (err u9997)
    )
    (ok true)
  )
)
