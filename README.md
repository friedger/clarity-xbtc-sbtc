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

### Token Contracts

- **xBTC**: `SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin`
- **sBTC**: `SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token`

## Error Codes

| Code | Description |
|------|-------------|
| `u500` | Insufficient xBTC balance |
| `u501` | Insufficient sBTC balance in contract |

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
│   └── xbtc-sbtc-swap.test.ts    # Contract tests
├── settings/
│   ├── Devnet.toml
│   ├── Mainnet.toml
│   └── Testnet.toml
├── Clarinet.toml                  # Clarinet configuration
└── vite.config.mjs               # Vite configuration for web app
```

## Usage

### Via Web App

1. Visit the web app and click "Connect Wallet"
2. Approve the connection in your Stacks wallet
3. Enter the amount of xBTC you want to swap
4. Click "Swap xBTC → sBTC"
5. Confirm the transaction in your wallet

### Via Contract Call

To swap 1000 xBTC for sBTC:

```clarity
(contract-call? .xbtc-sbtc-swap xbtc-to-sbtc-swap u1000)
```

## Security Considerations

- This is a **one-way swap** - sBTC cannot be swapped back to xBTC through this contract
- Users must have sufficient xBTC balance before calling the swap function
- The contract must be pre-funded with sufficient sBTC by the custodian
- xBTC tokens are not automatically burned; the custodian must burn them separately

