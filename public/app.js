import { connect, disconnect, getLocalStorage, request } from "@stacks/connect";
import {
  Cl,
  fetchCallReadOnlyFunction,
  Pc,
  principalCV,
} from "@stacks/transactions";

// Contract addresses - update these for mainnet
const SWAP_CONTRACT =
  "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.xbtc-sbtc-swap";

const XBTC_CONTRACT =
  "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin";

const SBTC_CONTRACT = "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token";

const XBTC_DECIMALS = 8;
const SBTC_DECIMALS = 8;

// UI Elements
const connectWalletBtn = document.getElementById("connect-wallet-btn");
const disconnectBtn = document.getElementById("disconnect-btn");
const walletSection = document.getElementById("wallet-section");
const walletInfo = document.getElementById("wallet-info");
const walletAddress = document.getElementById("wallet-address");
const swapSection = document.getElementById("swap-section");
const xbtcBalance = document.getElementById("xbtc-balance");
const iouBalance = document.getElementById("iou-balance");
const contractXbtcBalance = document.getElementById("contract-xbtc-balance");
const sbtcBalance = document.getElementById("sbtc-balance");
const swapAmountInput = document.getElementById("swap-amount");
const depositBtn = document.getElementById("deposit-btn");
const withdrawBtn = document.getElementById("withdraw-btn");
const claimBtn = document.getElementById("claim-btn");
const initUnwrapBtn = document.getElementById("init-unwrap-btn");
const refreshBalancesBtn = document.getElementById("refresh-balances-btn");
const statusMessage = document.getElementById("status-message");

// Utility functions
function showStatus(message, isError = false) {
  statusMessage.textContent = message;
  statusMessage.className = `status-message ${isError ? "error" : "success"}`;
  statusMessage.classList.remove("hidden");

  setTimeout(() => {
    statusMessage.classList.add("hidden");
  }, 5000);
}

function formatBalance(balance, decimals = 8) {
  const formatted = (balance / Math.pow(10, decimals)).toFixed(decimals);
  return parseFloat(formatted);
}

function parseAmount(amount, decimals = 8) {
  return Math.floor(parseFloat(amount) * Math.pow(10, decimals));
}

function shortenAddress(address) {
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

// Wallet connection
async function connectWallet() {
  connect();
}

function disconnectWallet() {
  disconnect();
}

// Read-only contract calls
async function getXbtcBalance(address) {
  try {
    const [contractAddress, contractName] = XBTC_CONTRACT.split(".");
    const result = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-balance",
      functionArgs: [principalCV(address)],
      senderAddress: address,
    });

    return Number(result.value.value);
  } catch (error) {
    console.error("Error fetching xBTC balance:", error);
    return 0;
  }
}

async function getSbtcBalance(address) {
  try {
    const [contractAddress, contractName] = SBTC_CONTRACT.split(".");
    const result = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-balance",
      functionArgs: [principalCV(address)],
      senderAddress: address,
    });

    return Number(result.value.value);
  } catch (error) {
    console.error("Error fetching sBTC balance:", error);
    return 0;
  }
}

async function getSwappingXbtcBalance(address) {
  try {
    const [contractAddress, contractName] = SWAP_CONTRACT.split(".");
    const result = await fetchCallReadOnlyFunction({
      contractAddress,
      contractName,
      functionName: "get-swapping-xbtc-balance",
      functionArgs: [principalCV(address)],
      senderAddress: address,
    });

    return Number(result.value.value);
  } catch (error) {
    console.error("Error fetching SWXBTC balance:", error);
    return 0;
  }
}

async function getContractXbtcBalance() {
  // Query Wrapped Bitcoin contract for the swap contract's xBTC balance
  try {
    const swapPrincipal = SWAP_CONTRACT.split(".").slice(0, 2).join(".");
    return await getXbtcBalance(swapPrincipal);
  } catch (error) {
    console.error("Error fetching contract xBTC balance:", error);
    return 0;
  }
}

async function updateBalances(userAddress) {
  try {
    const [xbtcBal, iouBal, contractXbtcBal, sbtcBal] = await Promise.all([
      getXbtcBalance(userAddress),
      getSwappingXbtcBalance(userAddress),
      getContractXbtcBalance(),
      getSbtcBalance(
        SWAP_CONTRACT.split(".")[0] + "." + SWAP_CONTRACT.split(".")[1]
      ),
    ]);

    xbtcBalance.textContent = formatBalance(xbtcBal, XBTC_DECIMALS) + " xBTC";
    iouBalance.textContent = formatBalance(iouBal, XBTC_DECIMALS) + " SWXBTC";
    contractXbtcBalance.textContent =
      formatBalance(contractXbtcBal, XBTC_DECIMALS) + " xBTC";
    sbtcBalance.textContent = formatBalance(sbtcBal, SBTC_DECIMALS) + " sBTC";
  } catch (error) {
    console.error("Error updating balances:", error);
    showStatus("Failed to fetch balances", true);
  }
}

// Deposit xBTC (mint SWXBTC)
async function performDepositXbtc() {
  const amount = swapAmountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showStatus("Please enter a valid amount", true);
    return;
  }

  const userData = getLocalStorage();
  const userAddress = userData.addresses.stx[0].address;
  const amountInSats = parseAmount(amount, XBTC_DECIMALS);

  try {
    depositBtn.disabled = true;
    depositBtn.textContent = "Processing...";

    const data = await request("stx_callContract", {
      contract: SWAP_CONTRACT,
      functionName: "deposit-xbtc",
      functionArgs: [Cl.uint(amountInSats)],
      postConditionMode: "deny",
      postConditions: [
        Pc.principal(userAddress)
          .willSendEq(amountInSats)
          .ft(XBTC_CONTRACT, "wrapped-bitcoin"),
      ],
    });

    console.log("Transaction submitted:", data);
    showStatus(`Deposit submitted! Transaction ID: ${data.txId}`);
    swapAmountInput.value = "";

    // Wait a bit then refresh balances
    setTimeout(() => {
      updateBalances(userAddress);
    }, 3000);
  } catch (error) {
    console.error("Deposit error:", error);
    showStatus(`Deposit failed: ${error.message}`, true);
  } finally {
    depositBtn.disabled = false;
    depositBtn.textContent = "Deposit xBTC (mint SWXBTC)";
  }
}

async function performWithdrawXbtc() {
  const amount = swapAmountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showStatus("Please enter a valid amount", true);
    return;
  }

  const userData = getLocalStorage();
  const userAddress = userData.addresses.stx[0].address;
  const amountInSats = parseAmount(amount, XBTC_DECIMALS);

  try {
    withdrawBtn.disabled = true;
    withdrawBtn.textContent = "Processing...";

    const data = await request("stx_callContract", {
      contract: SWAP_CONTRACT,
      functionName: "withdraw-xbtc",
      functionArgs: [Cl.uint(amountInSats)],
      postConditionMode: "deny",
      postConditions: [
        Pc.principal(SWAP_CONTRACT)
          .willSendEq(amountInSats)
          .ft(XBTC_CONTRACT, "wrapped-bitcoin"),
      ],
    });

    console.log("Transaction submitted:", data);
    showStatus(`Withdraw submitted! Transaction ID: ${data.txId}`);
    swapAmountInput.value = "";

    setTimeout(() => {
      updateBalances(userAddress);
    }, 3000);
  } catch (error) {
    console.error("Withdraw error:", error);
    showStatus(`Withdraw failed: ${error.message}`, true);
  } finally {
    withdrawBtn.disabled = false;
    withdrawBtn.textContent = "Withdraw xBTC (burn SWXBTC)";
  }
}

async function performClaimSbtc() {
  const userData = getLocalStorage();
  const userAddress = userData.addresses.stx[0].address;

  try {
    claimBtn.disabled = true;
    claimBtn.textContent = "Processing...";

    const data = await request("stx_callContract", {
      contract: SWAP_CONTRACT,
      functionName: "claim-sbtc",
      functionArgs: [],
      postConditionMode: "allow",
      postConditions: [],
    });

    console.log("Transaction submitted:", data);
    showStatus(`Claim submitted! Transaction ID: ${data.txId}`);

    setTimeout(() => {
      updateBalances(userAddress);
    }, 3000);
  } catch (error) {
    console.error("Claim error:", error);
    showStatus(`Claim failed: ${error.message}`, true);
  } finally {
    claimBtn.disabled = false;
    claimBtn.textContent = "Claim sBTC (burn SWXBTC)";
  }
}

async function performInitUnwrap() {
  const userData = getLocalStorage();
  const userAddress = userData.addresses.stx[0].address;

  try {
    initUnwrapBtn.disabled = true;
    initUnwrapBtn.textContent = "Processing...";

    const data = await request("stx_callContract", {
      contract: SWAP_CONTRACT,
      functionName: "init-unwrap",
      functionArgs: [],
      postConditionMode: "allow",
      postConditions: [],
    });

    console.log("Transaction submitted:", data);
    showStatus(`Init unwrap submitted! Transaction ID: ${data.txId}`);

    setTimeout(() => {
      updateBalances(userAddress);
    }, 3000);
  } catch (error) {
    console.error("Init unwrap error:", error);
    showStatus(`Init unwrap failed: ${error.message}`, true);
  } finally {
    initUnwrapBtn.disabled = false;
    initUnwrapBtn.textContent = "Init Unwrap (custodian)";
  }
}

// Event listeners
connectWalletBtn.addEventListener("click", connectWallet);
disconnectBtn.addEventListener("click", disconnectWallet);
depositBtn.addEventListener("click", performDepositXbtc);
withdrawBtn.addEventListener("click", performWithdrawXbtc);
claimBtn.addEventListener("click", performClaimSbtc);
initUnwrapBtn.addEventListener("click", performInitUnwrap);

refreshBalancesBtn.addEventListener("click", () => {
  if (getLocalStorage()) {
    const userData = getLocalStorage();
    const userAddress = userData.addresses.stx[0].address;
    console.log(userAddress);
    updateBalances(userAddress);
  }
});

// Initialize app
function initApp() {
  if (getLocalStorage()) {
    const userData = getLocalStorage();
    console.log(userData);

    const userAddress = userData.addresses.stx[0].address;

    // Show wallet info
    walletAddress.textContent = shortenAddress(userAddress);
    walletInfo.classList.remove("hidden");
    connectWalletBtn.classList.add("hidden");
    swapSection.classList.remove("hidden");

    // Load balances
    updateBalances(userAddress);
  } else {
    // Show connect button
    walletInfo.classList.add("hidden");
    connectWalletBtn.classList.remove("hidden");
    swapSection.classList.add("hidden");
  }
}

// Start the app
initApp();
