(define-read-only (invariant-total-supply)
  (let (
      (total-supply (ft-get-supply swapping-xbtc))
      (xbtc-balance (get-xbtc-balance current-contract))
    )
    (asserts! (>= total-supply xbtc-balance) (err u9999))
    (ok true)
  )
)