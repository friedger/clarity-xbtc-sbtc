(define-constant err-unauthorized (err u401))
(define-constant err-forbidden (err u403))
(define-constant deployer tx-sender)

(define-fungible-token swapping-xbtc)

(define-data-var swap-contract (optional principal) none)

(define-public (transfer
    (amount uint)
    (sender principal)
    (recipient principal)
    (memo (optional (buff 34)))
  )
  (begin
    (asserts! (or (is-eq tx-sender sender) (is-eq contract-caller sender))
      err-unauthorized
    )
    (try! (ft-transfer? swapping-xbtc amount sender recipient))
    (match memo
      to-print (print to-print)
      0x
    )
    (ok true)
  )
)

(define-read-only (get-name)
  (ok "Swapping Wrapped Bitcoin")
)

(define-read-only (get-symbol)
  (ok "SWXBTC")
)

(define-read-only (get-decimals)
  (ok u8)
)

(define-read-only (get-balance (who principal))
  (ok (ft-get-balance swapping-xbtc who))
)

(define-read-only (get-total-supply)
  (ok (ft-get-supply swapping-xbtc))
)

(define-read-only (get-token-uri)
  (ok none)
)

(define-public (mint
    (amount uint)
    (user principal)
  )
  (begin
    (asserts! (is-swap-contract-calling) err-unauthorized)
    (try! (ft-mint? swapping-xbtc amount user))
    (ok true)
  )
)

(define-public (burn
    (amount uint)
    (user principal)
  )
  (begin
    (asserts! (is-swap-contract-calling) err-unauthorized)
    (try! (ft-burn? swapping-xbtc amount user))
    (ok true)
  )
)

(define-private (is-swap-contract-calling)
  (is-eq contract-caller (unwrap! (var-get swap-contract) false))
)

;; can be called only once
(define-public (set-swap-contract (ctr principal))
  (begin
    (asserts! (is-eq tx-sender deployer) err-unauthorized)
    (asserts! (is-none (var-get swap-contract)) err-forbidden)
    (var-set swap-contract (some ctr))
    (ok true)
  )
)
