import { SimulationBuilder } from "stxer";
import { Cl } from "@stacks/transactions";

// ============================================
// Constants - Update these addresses as needed
// ============================================

// The custodian who provides sBTC to the swap contract
const CUSTODIAN = "SM35BNE8A592DRTQ7XVF1T3KY37XEZTPGGDC8EQYP";

// User who will swap xBTC for sBTC
const SWAP_USER = "SM1EXAREHM9QJ71MDMC810N6HF3QYQHKR01XM36JP";

// User who triggers the excess withdrawal (can be anyone)
const EXCESS_WITHDRAWER = "SP2J6ZY48GV1EZ5V2V5RB9MP66SW86PYKKNRV9EJ7";

// Admin of the xbtc-swap-wallet who sends excess back
const WALLET_ADMIN = "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9";
const DEPLOYER = WALLET_ADMIN;

// Contract addresses
const SWAP_CONTRACT =
  "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-sbtc-swap-v4";
const SBTC_TOKEN = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";
const SBTC_TOKEN_NAME = "sbtc-token";
const XBTC_SWAP_WALLET =
  "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-swap-wallet";

// Amounts (in smallest units - satoshis)
const SBTC_FUNDING_AMOUNT = 50_00000000; // 50 sBTC (8 decimals)
const SWAP_AMOUNT = 1_00000000; // 1 xBTC to swap for 1 sBTC
const RETURN_AMOUNT = SBTC_FUNDING_AMOUNT - SWAP_AMOUNT; // 10 sBTC to return to custodian

// ============================================
// Simulation
// ============================================

const simulationId = await SimulationBuilder.new({
  network: "mainnet",
})
  // Step 0: User deposits xBTC for SWXBTC
  .withSender(DEPLOYER)
  .addContractCall({
    contract_id: SWAP_CONTRACT,
    function_name: "initialize",
    function_args: [Cl.principal(CUSTODIAN), Cl.principal(CUSTODIAN)],
  })

  // Step 1: User deposits xBTC for SWXBTC
  .withSender(SWAP_USER)
  .addContractCall({
    contract_id: SWAP_CONTRACT,
    function_name: "deposit-xbtc",
    function_args: [Cl.uint(SWAP_AMOUNT + 100)],
  })
  .addContractCall({
    contract_id: SWAP_CONTRACT,
    function_name: "withdraw-xbtc",
    function_args: [Cl.uint(100)],
  })

  // Step 2: Custodian initializes unwrap
  .withSender(CUSTODIAN)
  .addContractCall({
    contract_id: SWAP_CONTRACT,
    function_name: "init-unwrap",
    function_args: [],
  })

  // Step 3: Custodian sends 50 sBTC to the swap contract
  .withSender(CUSTODIAN)
  .addContractCall({
    contract_id: SBTC_TOKEN,
    function_name: "transfer",
    function_args: [
      Cl.uint(SBTC_FUNDING_AMOUNT),
      Cl.principal(CUSTODIAN),
      Cl.principal(SWAP_CONTRACT),
      Cl.none(),
    ],
  })

  // Step 4: Custodian initializes unwrap
  .withSender(SWAP_USER)
  .addContractCall({
    contract_id: SWAP_CONTRACT,
    function_name: "claim-sbtc",
    function_args: [],
  })

  // Step 5: Another user withdraws excess sBTC to the xbtc-swap-wallet
  .withSender(EXCESS_WITHDRAWER)
  .addContractCall({
    contract_id: SWAP_CONTRACT,
    function_name: "withdraw-excess-sbtc",
    function_args: [],
  })

  // Step 6: Admin of xbtc-swap-wallet sends excess sBTC back to custodian
  .withSender(WALLET_ADMIN)
  .addContractCall({
    contract_id: XBTC_SWAP_WALLET,
    function_name: "sip010-transfer",
    function_args: [
      Cl.uint(RETURN_AMOUNT + 1),
      Cl.principal(CUSTODIAN),
      Cl.none(),
      Cl.principal(SBTC_TOKEN),
      Cl.stringAscii(SBTC_TOKEN_NAME),
      Cl.none(),
    ],
  })
  .addContractCall({
    contract_id: XBTC_SWAP_WALLET,
    function_name: "sip010-transfer",
    function_args: [
      Cl.uint(RETURN_AMOUNT),
      Cl.principal(CUSTODIAN),
      Cl.none(),
      Cl.principal(SBTC_TOKEN),
      Cl.stringAscii(SBTC_TOKEN_NAME),
      Cl.none(),
    ],
  })
  .run();

console.log(`Simulation created!`);
console.log(
  `View results at: https://stxer.xyz/simulations/mainnet/${simulationId}`,
);
