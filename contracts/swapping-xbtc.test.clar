
(define-public (test-transfer (amount uint) (other-user principal) (memo (optional (string-ascii 100))))
    (let ((initial-balance (ft-get-balance swapping-xbtc tx-sender)))
      (asserts! (>= initial-balance amount) (ok true))
      (try! (ft-transfer? swapping-xbtc amount tx-sender recipient))
      (asserts! (is-eq (ft-get-balance swapping-xbtc tx-sender) (- initial-balance amount)) (err u9998))
      (ok true)
    )
)