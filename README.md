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

## Development

### Prerequisites

- [Clarinet](https://github.com/hirosystems/clarinet) - Clarity smart contract development tool
- [Node.js](https://nodejs.org/) and pnpm - For running tests

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
├── tests/
│   └── xbtc-sbtc-swap.test.ts    # Contract tests
├── settings/
│   ├── Devnet.toml
│   ├── Mainnet.toml
│   └── Testnet.toml
└── Clarinet.toml                  # Clarinet configuration
```

## Usage Example

To swap 1000 xBTC for sBTC:

```clarity
(contract-call? .xbtc-sbtc-swap xbtc-to-sbtc-swap u1000)
```

## Security Considerations

- This is a **one-way swap** - sBTC cannot be swapped back to xBTC through this contract
- Users must have sufficient xBTC balance before calling the swap function
- The contract must be pre-funded with sufficient sBTC by the custodian
- xBTC tokens are not automatically burned; the custodian must burn them separately

