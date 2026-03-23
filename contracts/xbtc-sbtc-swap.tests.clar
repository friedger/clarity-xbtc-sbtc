(define-read-only (invariant-total-supply)
  (let (
      (total-supply (get-swapping-xbtc-supply))
      (xbtc-balance (get-xbtc-balance current-contract))
    )
    (>= total-supply xbtc-balance)
  )
)