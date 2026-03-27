# xBTC to sBTC Swap Contract

A Clarity smart contract that coordinates a two‑step migration from xBTC (Wrapped Bitcoin) to sBTC on the Stacks blockchain.

Unlike a simple atomic swap, this design uses an **IOU token (`swapping-xbtc`)** to track deposited xBTC and enable users to claim sBTC once the unwrapped xBTC is available as sBTC via the sBTC bridge.

## Overview

This project is composed of two contracts:

- `xbtc-sbtc-swap.clar` — the main swap coordinator that accepts xBTC deposits, mints IOUs, and pays out sBTC when available.
- `swapping-xbtc.clar` — an FT contract representing IOUs (token symbol `SWXBTC`) that can be minted/burned only by the swap contract.

### High‑level flow

1. **User deposits xBTC** into the swap contract via `deposit-xbtc`. The contract mints the equivalent amount of `swapping-xbtc` IOUs to the user.
2. **Custodian collects xBTC** from the contract via `init-unwrap` and sends BTC into the sBTC bridge.
3. Once sBTC is funded, **users claim sBTC** by burning their IOUs via `claim-sbtc`.
4. When the contract holds more sBTC than needed to back circulating IOUs, anyone can call `withdraw-excess-sbtc` to send the surplus to the designated excess wallet.

## Contract Details

### Token Contracts

- **xBTC** (Wrapped Bitcoin): `SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin`
- **sBTC**: `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`
- **SWXBTC (swapping-xbtc)**: IOU fungible token, implemented in `swapping-xbtc.clar`

---

## Public Functions (Swap Contract)

### `deposit-xbtc`

Deposits xBTC into the swap contract and mints `swapping-xbtc` IOUs to the depositor.

```clarity
(deposit-xbtc (amount uint))
```

**Returns:**
- `(ok true)` on success
- Reverts on failure (e.g., transfer failure)

**Process:**
1. Transfers `amount` xBTC from the caller to the swap contract.
2. Mints `amount` `swapping-xbtc` tokens to the caller.

---

### `withdraw-xbtc`

Withdraws xBTC from the contract back to the caller by burning `swapping-xbtc` IOUs.

```clarity
(withdraw-xbtc (amount uint))
```

**Returns:**
- `(ok true)` on success
- `(err u513)` if the caller has insufficient `swapping-xbtc` balance
- `(err u511)` if the contract has insufficient xBTC to fulfill the withdraw, e.g. when unwrap was already initialized.

**Process:**
1. Confirms the caller has at least `amount` `swapping-xbtc`.
2. Confirms the contract holds at least `amount` xBTC.
3. Burns `amount` `swapping-xbtc` from the caller.
4. Transfers `amount` xBTC from the contract to the caller.

---

### `claim-sbtc`

Allows users to redeem their `swapping-xbtc` IOUs for sBTC, up to the available sBTC balance in the contract.

```clarity
(claim-sbtc)
```

**Returns:**
- `(ok true)` on success
- `(err u511)` if the caller has no `swapping-xbtc` balance (or amount would be zero)

**Process:**
1. Reads the caller’s `swapping-xbtc` balance.
2. Determines the claimable amount as the lesser of the caller’s IOUs and the contract’s sBTC balance.
3. Burns that amount of `swapping-xbtc` from the caller.
4. Transfers that amount of sBTC from the contract to the caller.

---

### `withdraw-excess-sbtc`

Withdraws sBTC that is not needed to back circulating `swapping-xbtc` IOUs.

```clarity
(withdraw-excess-sbtc)
```

**Returns:**
- `(ok true)` on success
- `(err u514)` if there is no excess sBTC to withdraw

**Process:**
1. Reads the contract’s sBTC balance.
2. Reads total `swapping-xbtc` supply (IOUs outstanding).
3. If `sBTC balance > IOU supply`, sends the difference to the swap wallet (`excess-sbtc-receiver`).

**Notes:**
- Anyone can call this (permissionless).
- The receiver is hardcoded to `SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-swap-wallet`.

---

### `initialize`

Sets the custodian address that will receive xBTC during the unwrap flow and the operator who can start the flow.

```clarity
(initialize (xbtc-receiver principal) (operator principal))
```

**Returns:**
- `(ok true)` on success
- `(err u401)` if caller is not the deployer
- `(err u403)` if already initialized

**Notes:**
- This function can only be called once.

---

### `init-unwrap`

Transfers all xBTC held by the contract to the configured custodian.

```clarity
(init-unwrap)
```

**Returns:**
- `(ok true)` on success

**Notes:**
- The custodian address must be initialized first via `initialize`.
- This is intended to let the custodian collect xBTC for off‑chain bridge operations.

---

### `enroll`

Enrolls the contract in a stacking/dual‑stacking contract that implements the `enroll-trait`.

```clarity
(enroll (enroll-contract <enroll-trait>) (receiver (optional principal)))
```

**Returns:**
- `(ok true)` on success
- Reverts if the enrollment contract fails

---

## Read-Only Helpers

### `get-xbtc-balance`

```clarity
(get-xbtc-balance (user principal))
```

Returns the xBTC balance for a given principal.

### `get-swapping-xbtc-balance`

```clarity
(get-swapping-xbtc-balance (user principal))
```

Returns the `swapping-xbtc` IOU balance for a given principal.

### `get-sbtc-balance`

```clarity
(get-sbtc-balance (user principal))
```

Returns the sBTC balance for a given principal.

---

## Errors (Known Codes)

| Code | Meaning |
|------|---------|
| `u401` | Unauthorized (caller not allowed) |
| `u403` | Forbidden (already initialized) |
| `u510` | Not initialized (custodian missing) |
| `u511` | Not enough xBTC in contract |
| `u512` | Not enough `swapping-xbtc` balance |
| `u513` | No excess sBTC to withdraw |

---

## Web Application

A simple web interface is provided to interact with the swap contract.

### Running the Web App

Install dependencies:
```bash
pnpm install
```

Start the development server:
```bash
pnpm dev
```

The app will open at `http://localhost:3000`

Build for production:
```bash
pnpm build
```

### Configuration

The web app is configured for testnet by default. To switch to mainnet:

1. Open `public/app.js`
2. Change `const IS_MAINNET = false;` to `const IS_MAINNET = true;`
3. Update the `SWAP_CONTRACT` address to the mainnet deployment

---

## Development

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - Clarity smart contract development tool
- [Node.js](https://nodejs.org/) and pnpm - For running tests and web app

### Testing

Check contracts for errors:
```bash
clarinet check
```

Run the test suite:
```bash
pnpm test
```

### Project Structure

```
├── contracts/
│   ├── swapping-xbtc.clar      # IOU token contract (SWXBTC)
│   └── xbtc-sbtc-swap.clar     # Swap coordinator contract
├── public/
│   ├── index.html              # Web app UI
│   ├── app.js                  # Wallet integration & contract calls
│   └── styles.css              # Styling
├── tests/
│   ├── xbtc-sbtc-swap.test.ts
│   ├── xbtc-sbtc-swap_withdraw.test.ts
│   ├── xbtc-sbtc-swap_enroll.test.ts
│   └── utils.ts
├── settings/
│   ├── Devnet.toml
│   ├── Mainnet.toml
│   └── Testnet.toml
├── Clarinet.toml                # Clarinet configuration
├── vite.config.mjs             # Vite configuration for web app
├── package.json                # Dependencies and scripts
└── README.md                    # This file
```

## Usage

### Via Web App

1. Visit the web app and click "Connect Wallet"
2. Approve the connection in your Stacks wallet
3. Use the UI to:
   - Deposit xBTC and receive `swapping-xbtc` IOUs
   - Claim sBTC once the bridge is funded
4. Confirm transactions in your wallet

### Via Contract Call (Clarity)

#### Deposit xBTC (mint IOUs)

```clarity
(contract-call? .xbtc-sbtc-swap deposit-xbtc u1000)
```

#### Withdraw xBTC (burn IOUs)

```clarity
(contract-call? .xbtc-sbtc-swap withdraw-xbtc u1000)
```

#### Claim sBTC (burn IOUs for sBTC)

```clarity
(contract-call? .xbtc-sbtc-swap claim-sbtc)
```

#### Withdraw Excess sBTC

```clarity
(contract-call? .xbtc-sbtc-swap withdraw-excess-sbtc)
```

#### Initialize Custodian (on deploy)

```clarity
(contract-call? .xbtc-sbtc-swap initialize 'SP... 'SP...)
```

#### Send contract-held xBTC to custodian

```clarity
(contract-call? .xbtc-sbtc-swap init-unwrap)
```

```

## Security Considerations

- This is a **one-way swap** - sBTC cannot be swapped back to xBTC through this contract
- Users must have sufficient xBTC balance before calling the swap function
