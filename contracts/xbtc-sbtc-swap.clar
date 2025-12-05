;; xbtx to sbtc one-way swap
;; swaps xbtc tokens for sbtc tokens 1:1

;; 1. Custodian transfers backing Bitocin as sBTC to this contract
;; 2. Users call xbtx-to-sbtc-swap, receive sBTC and send xBTC to this contract
;; 3. Custodian can burn xBTC in this contract

(define-public (xbtc-to-sbtc-swap (amount uint))
  (let (
      (user-xbtc-balance (get-xbtc-balance tx-sender))
      (contract-sbtc-balance (get-sbtc-balance current-contract))
    )
    (asserts! (>= user-xbtc-balance amount) (err u500))
    (asserts! (>= contract-sbtc-balance amount) (err u501))
    (try! (transfer-sbtc-to amount tx-sender))
    (try! (burn-xbtc amount))
    (ok true)
  )
)

;; allows to withdraw sBTC that is not backing any xBTC to the SIP-031 endowment recipient address
(define-public (withdraw-excess-sbtc)
  (let (
      (sbtc-contract-balance (get-sbtc-balance current-contract))
      (xbtc-supply (unwrap-panic (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        get-total-supply
      )))
      (xbtc-contract-balance (get-xbtc-balance current-contract))
      (liquid-xbtc (- xbtc-supply xbtc-contract-balance))
    )
    (asserts! (> sbtc-contract-balance liquid-xbtc) (err u502))
    (let ((excess-sbtc (- sbtc-contract-balance liquid-xbtc)))
      (transfer-sbtc-to excess-sbtc (get-endowment-address))
    )
  )
)

;; private functions

;; transfers sbtc from this contract to the tx-sender
(define-private (transfer-sbtc-to
    (amount uint)
    (sbtc-recipient principal)
  )
  (as-contract?
    ((with-ft 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token "sbtc-token"
      amount
    ))
    (try! (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
      transfer amount current-contract sbtc-recipient none
    ))
  )
)

;; burns xbtc by transferring to the wrapped bitcoin to this contract
(define-private (burn-xbtc (amount uint))
  (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
    transfer amount tx-sender current-contract none
  )
)

;; read-only functions

(define-read-only (get-xbtc-balance (user principal))
  (unwrap-panic (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
    get-balance user
  ))
)

(define-read-only (get-sbtc-balance (user principal))
  (unwrap-panic (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
    get-balance user
  ))
)

(define-read-only (get-endowment-address)
  (contract-call? 'SP000000000000000000002Q6VF78.sip-031 get-recipient)
)
