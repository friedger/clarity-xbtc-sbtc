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
(define-constant err-not-enough-swapping-xbtc (err u512))
(define-constant err-no-excess-sbtc (err u513))
(define-constant err-not-enough-tokens (err u514))
(define-constant deployer tx-sender)

;; allows to withdraw sBTC that is not backed by swapping-xbtc to the xbtc-swap smart wallet
(define-constant excess-sbtc-receiver 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-swap-wallet)
;; xbtc receiver to unwrap and burn xBTC
(define-data-var custodian (optional principal) none)
;; initalizes the unwrap
(define-data-var custodian-operator (optional principal) none)

(define-public (deposit-xbtc (amount uint))
  (let ((user tx-sender))
    (try! (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
      transfer amount user current-contract none
    ))
    (try! (as-contract? () (try! (contract-call? .swapping-xbtc-v4 mint amount user))))
    (ok true)
  )
)

(define-public (withdraw-xbtc (amount uint))
  (let (
      (user tx-sender)
      (balance (get-swapping-xbtc-balance user))
      (xbtc-balance (get-xbtc-balance current-contract))
    )
    (asserts! (>= balance amount) err-not-enough-swapping-xbtc)
    (asserts! (>= xbtc-balance amount) err-not-enough-xbtc)
    (try! (as-contract?
      ((with-ft 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        "wrapped-bitcoin" amount
      ))
      (begin
        (try! (contract-call? .swapping-xbtc-v4 burn amount user))
        (try! (contract-call?
          'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin transfer
          amount current-contract user none
        ))
      )))
    (ok true)
  )
)

(define-public (init-unwrap)
  (let (
      (balance (get-xbtc-balance current-contract))
      (operator (unwrap! (var-get custodian-operator) err-not-initialized))
      (xbtc-receiver (unwrap! (var-get custodian) err-not-initialized))
    )
    (asserts! (is-eq tx-sender operator) err-unauthorized)
    ;; send all xbtc to custodian
    (try! (as-contract?
      ((with-ft 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        "wrapped-bitcoin" balance
      ))
      (try! (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
        transfer balance current-contract xbtc-receiver none
      ))
    ))
    (ok true)
  )
)

;; Claim as much as possible sBTC in exchange for swapping xBTC.
;; Only fails if 0 sBTC available.
(define-public (claim-sbtc)
  (let (
      (user tx-sender)
      (balance (get-swapping-xbtc-balance user))
      (sbtc-balance (get-sbtc-balance current-contract))
      (amount (if (< balance sbtc-balance)
        balance
        sbtc-balance
      ))
    )
    (asserts! (> amount u0) err-not-enough-tokens)
    (try! (as-contract? () (try! (contract-call? .swapping-xbtc-v4 burn amount user))))
    (try! (transfer-sbtc-to amount user))
    (ok true)
  )
)

;; @param xbtc-receiver will hold the xBTC that will be burnt for btc.
;; @param operator has permission to initiate the unwrap process.
(define-public (initialize (xbtc-receiver principal) (operator principal))
  (begin
    (asserts! (is-eq tx-sender deployer) err-unauthorized)
    (asserts! (is-none (var-get custodian)) err-forbidden)
    (asserts! (is-none (var-get custodian-operator)) err-forbidden)
    (var-set custodian (some xbtc-receiver))
    (var-set custodian-operator (some operator))
    (ok true)
  )
)


(define-public (withdraw-excess-sbtc)
  (let (
      (sbtc-contract-balance (get-sbtc-balance current-contract))
      (swapping-xbtc-supply (get-swapping-xbtc-supply))
    )
    (asserts! (> sbtc-contract-balance swapping-xbtc-supply) err-no-excess-sbtc)
    (let ((excess-sbtc (- sbtc-contract-balance swapping-xbtc-supply)))
      (transfer-sbtc-to excess-sbtc excess-sbtc-receiver)
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

;; read-only functions

(define-read-only (get-xbtc-balance (user principal))
  (unwrap-panic (contract-call? 'SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin
    get-balance user
  ))
)

(define-read-only (get-swapping-xbtc-balance (user principal))
  (unwrap-panic (contract-call? .swapping-xbtc-v4 get-balance user))
)

(define-read-only (get-sbtc-balance (user principal))
  (unwrap-panic (contract-call? 'SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token
    get-balance user
  ))
)

(define-read-only (get-swapping-xbtc-supply)
  (unwrap-panic (contract-call? .swapping-xbtc-v4 get-total-supply))
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
  (begin
    (asserts! (is-eq tx-sender deployer) err-unauthorized)
    (as-contract? () (try! (contract-call? enroll-contract enroll receiver)))
  )
)

(try! (contract-call? .swapping-xbtc-v4 set-swap-contract current-contract))
