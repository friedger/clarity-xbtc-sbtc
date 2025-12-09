# xBTC to sBTC Swap Contract

A Clarity smart contract that enables one-way swapping of xBTC (Wrapped Bitcoin) tokens to sBTC tokens at a 1:1 ratio on the Stacks blockchain.

## Overview

This contract facilitates the migration from xBTC to sBTC by providing a trustless swap mechanism. Users can exchange their xBTC tokens for sBTC tokens held by the contract, while the xBTC tokens are transferred to the contract for eventual burning by the custodian.

## How It Works

The swap process follows these steps:

1. **Custodian Setup**: The custodian transfers backing Bitcoin as sBTC to this contract
2. **User Swap**: Users call `xbtc-to-sbtc-swap` to:
   - Send their xBTC to the contract
   - Receive an equal amount of sBTC from the contract
3. **Custodian Cleanup**: The custodian can burn the accumulated xBTC in the contract
4. **Excess Withdrawal**: Excess sBTC (not backing any xBTC) can be withdrawn to the xbtc-swap smart wallet

## Contract Details

### Public Functions

#### `xbtc-to-sbtc-swap`

Swaps xBTC tokens for sBTC tokens at a 1:1 ratio.

```clarity
(xbtc-to-sbtc-swap (amount uint))
```

**Parameters:**
- `amount`: The amount of xBTC to swap for sBTC (in smallest units)

**Returns:**
- `(ok true)` on success
- `(err u500)` if user has insufficient xBTC balance
- `(err u501)` if contract has insufficient sBTC balance
- `(err u3)` if user wants to swap 0 xBTC

**Process:**
1. Checks user's xBTC balance is sufficient
2. Checks contract's sBTC balance is sufficient
3. Transfers sBTC from contract to user
4. Transfers xBTC from user to contract

**Example:**
Swap 1000 xBTC for 1000 sBTC:
```clarity
(contract-call? .xbtc-sbtc-swap xbtc-to-sbtc-swap u1000)
```

#### `withdraw-excess-sbtc`

Withdraws any excess sBTC from the contract that is not needed to back the liquid xBTC supply. The excess is sent to the xBTC Swap smart wallet.

```clarity
(withdraw-excess-sbtc)
```

**Parameters:** None

**Returns:**
- `(ok true)` on success
- `(err u502)` if there is no excess sBTC to withdraw

**Process:**
1. Calculates total xBTC supply
2. Determines amount of xBTC locked in contract (no longer in circulation)
3. Calculates liquid xBTC (xBTC supply - xBTC in contract)
4. Compares contract's sBTC balance to liquid xBTC:
   - If sBTC balance > liquid xBTC, the difference is excess
   - Excess sBTC is transferred to the endowment address
   - Fails if no excess exists

**Notes:**
- Can be called by anyone (permissionless)
- Excess sBTC is sent to `SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-swap-wallet`, not the caller
- Ensures only sBTC backing circulating xBTC remains in the contract

**Example:**
```clarity
(contract-call? .xbtc-sbtc-swap withdraw-excess-sbtc)
```

#### `enroll`

Enrolls this contract in a staking or dual stacking contract. This allows the contract's sBTC to participate in stacking rewards.

```clarity
(enroll (enroll-contract <enroll-trait>) (receiver (optional principal)))
```

**Parameters:**
- `enroll-contract`: A contract implementing the enroll-trait that handles staking enrollment
- `receiver`: Optional principal to receive stacking rewards (if none, defaults to contract)

**Returns:**
- `(ok true)` on success
- `(err u104)` if not enough sBTC for enrollment (e.g., Dual Stacking v1 minimum requirements)

**Process:**
1. Calls the provided enroll-contract's enroll function with complete asset restrictions

**Example:**
Enroll in a staking contract:
```clarity
(contract-call? .xbtc-sbtc-swap enroll
   'SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v1
   none)
```

### Read-Only Functions

#### `get-xbtc-balance`

```clarity
(get-xbtc-balance (user principal))
```

Returns the xBTC balance of a given principal.

#### `get-sbtc-balance`

```clarity
(get-sbtc-balance (user principal))
```

Returns the sBTC balance of a given principal.

### Token Contracts

- **xBTC**: `SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin`
- **sBTC**: `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`

## Error Codes

| Code | Description |
|------|-------------|
| `u3` | Non-positive amount (user wants to swap 0 xBTC) |
| `u500` | Insufficient xBTC balance |
| `u501` | Insufficient sBTC balance in contract |
| `u502` | withdraw: Withdraw: No excess sBTC to withdraw |
| `u104` | enroll: Not enough sBTC for Dual Stacking v1 |

## Web Application

A user-friendly web interface is provided to interact with the swap contract. Users can connect their Stacks wallet and swap xBTC for sBTC with just a few clicks.

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

### Features

- 🔐 **Wallet Connection**: Connect using Hiro Wallet or other Stacks wallets
- 💰 **Balance Display**: View your xBTC balance and contract's sBTC balance
- 🔄 **One-Click Swap**: Simple interface to swap xBTC to sBTC
- ✅ **Post Conditions**: Transactions include safety checks to protect your assets
- 📱 **Responsive Design**: Works on desktop and mobile devices

### Configuration

The web app is configured for testnet by default. To switch to mainnet:

1. Open `public/app.js`
2. Change `const IS_MAINNET = false;` to `const IS_MAINNET = true;`
3. Update the `SWAP_CONTRACT` address to the mainnet deployment

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
│   └── xbtc-sbtc-swap.clar       # Main swap contract
├── public/
│   ├── index.html                # Web app UI
│   ├── app.js                    # Wallet integration & contract calls
│   └── styles.css                # Styling
├── tests/
│   ├── xbtc-sbtc-swap.test.ts    # Swap functionality tests
│   ├── xbtc-sbtc-swap_withdraw.test.ts # Withdrawal functionality tests
│   └── utils.ts                  # Test utilities
├── settings/
│   ├── Devnet.toml
│   ├── Mainnet.toml
│   └── Testnet.toml
├── Clarinet.toml                  # Clarinet configuration
├── vite.config.mjs               # Vite configuration for web app
├── package.json                  # Dependencies and scripts
└── README.md                      # This file
```

## Usage

### Via Web App

1. Visit the web app and click "Connect Wallet"
2. Approve the connection in your Stacks wallet
3. Enter the amount of xBTC you want to swap
4. Click "Swap xBTC → sBTC"
5. Confirm the transaction in your wallet

### Via Contract Call (Clarity)

#### Swap xBTC to sBTC

To swap 1000 xBTC for sBTC:

```clarity
(contract-call? .xbtc-sbtc-swap xbtc-to-sbtc-swap u1000)
```

#### Withdraw Excess sBTC

After swaps have reduced the liquid xBTC supply, withdraw the excess:

```clarity
(contract-call? .xbtc-sbtc-swap withdraw-excess-sbtc)
```

#### Enroll in Staking

Enable the contract's sBTC to generate stacking rewards:

```clarity
(contract-call? .xbtc-sbtc-swap enroll .my-staking-contract (some 'SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.reward-receiver))
```

## Security Considerations

- This is a **one-way swap** - sBTC cannot be swapped back to xBTC through this contract
- The contract must be pre-funded with sufficient sBTC by the custodian
- Users must have sufficient xBTC balance before calling the swap function
- xBTC tokens are not automatically burned; the custodian must burn them separately
