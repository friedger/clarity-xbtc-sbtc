;; xbtc to sbtc one-way swap
;; swaps xbtc tokens for sbtc tokens 1:1

;; 1. Users deposit xBTC and receives an IOU tokens
;; 2. Custodian receives xBTC every 2 weeks (in sync with stacking cycles just because)
;; 3. Custodian sends BTC to sBTC bridge deposit address
;; 4. Users claim their sBTC in exchange for IOU tokens

(define-constant err-unauthorized (err u401))
(define-constant err-forbidden (err u403))
(define-constant err-not-initialized (err u510))
(define-constant err-not-enough-xbtc (err u511))
(define-constant err-not-enough-sbtc (err u512))
(define-constant err-not-enough-swapping-xbtc (err u513))
(define-constant err-no-excess-sbtc (err u514))
(define-constant deployer tx-sender)

;; allows to withdraw sBTC that is not backed by swapping-xbtc to the xbtc-swap smart wallet
(define-constant excess-sbtc-receiver 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-swap-wallet)

(define-data-var custodian (optional principal) none)

(define-public (withdraw-excess-sbtc)
  (let (
      (sbtc-contract-balance (get-sbtc-balance current-contract))
      (swapping-xbtc-supply (unwrap-panic (contract-call? .swapping-xbtc get-total-supply)))
    )
    (asserts! (> sbtc-contract-balance swapping-xbtc-supply) err-no-excess-sbtc)
    (let ((excess-sbtc (- sbtc-contract-balance swapping-xbtc-supply)))
      (transfer-sbtc-to excess-sbtc excess-sbtc-receiver)
    )
  )
)

(define-public (deposit-xbtc (amount uint))
  (let ((user tx-sender))
    (try! (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
      transfer amount user current-contract none
    ))
    (try! (as-contract? () (try! (contract-call? .swapping-xbtc mint amount user))))
    (ok true)
  )
)

(define-public (withdraw-xbtc (amount uint))
  (let (
      (user tx-sender)
      (balance (unwrap-panic (contract-call? .swapping-xbtc get-balance tx-sender)))
      (xbtc-balance (get-xbtc-balance current-contract))
    )
    (asserts! (>= balance amount) err-not-enough-swapping-xbtc)
    (asserts! (>= xbtc-balance amount) err-not-enough-xbtc)
    (try! (as-contract?
      ((with-ft 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        "wrapped-bitcoin" amount
      ))
      (begin
        (try! (contract-call? .swapping-xbtc burn amount user))
        (try! (contract-call?
          'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin transfer
          amount current-contract user none
        ))
      )))
    (ok true)
  )
)

(define-public (init-unwrap)
  (let ((balance (get-xbtc-balance current-contract)))
    ;; send all xbtc to custodian
    (try! (as-contract?
      ((with-ft 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        "wrapped-bitcoin" balance
      ))
      (try! (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        transfer balance current-contract
        (unwrap! (var-get custodian) err-not-initialized) none
      ))
    ))
    (ok true)
  )
)

(define-public (claim-sbtc)
  (let (
      (user tx-sender)
      (balance (unwrap-panic (contract-call? .swapping-xbtc get-balance user)))
      (sbtc-balance (get-sbtc-balance current-contract))
      (amount (if (< balance sbtc-balance)
        balance
        sbtc-balance
      ))
    )
    ;; assert amount <= balance
    (asserts! (> amount u0) err-not-enough-xbtc)
    (try! (as-contract? () (try! (contract-call? .swapping-xbtc burn amount user))))
    (try! (transfer-sbtc-to amount user))
    (ok true)
  )
)

(define-public (initialize (custodian-address principal))
  (begin
    (asserts! (is-eq tx-sender deployer) err-unauthorized)
    (asserts! (is-none (var-get custodian)) err-forbidden)
    (var-set custodian (some custodian-address))
    (ok true)
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

;; read-only functions

(define-read-only (get-xbtc-balance (user principal))
  (unwrap-panic (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
    get-balance user
  ))
)

(define-read-only (get-swapping-xbtc-balance (user principal))
  (unwrap-panic (contract-call? .swapping-xbtc get-balance user))
)

(define-read-only (get-sbtc-balance (user principal))
  (unwrap-panic (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
    get-balance user
  ))
)

;; enrollment of dual stacking

;; enrolls this contract in the dual stacking contract or similar contracts
(define-trait enroll-trait (
  (enroll
    ((optional principal))
    (response bool uint)
  )
))

(define-public (enroll
    (enroll-contract <enroll-trait>)
    (receiver (optional principal))
  )
  (as-contract? () (try! (contract-call? enroll-contract enroll receiver)))
)

(try! (contract-call? .swapping-xbtc set-swap-contract current-contract))
