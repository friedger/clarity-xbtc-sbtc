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
const sbtcBalance = document.getElementById("sbtc-balance");
const swapAmountInput = document.getElementById("swap-amount");
const swapBtn = document.getElementById("swap-btn");
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

async function updateBalances(userAddress) {
  try {
    const [xbtcBal, sbtcBal] = await Promise.all([
      getXbtcBalance(userAddress),
      getSbtcBalance(
        SWAP_CONTRACT.split(".")[0] + "." + SWAP_CONTRACT.split(".")[1]
      ),
    ]);

    xbtcBalance.textContent = formatBalance(xbtcBal, XBTC_DECIMALS) + " xBTC";
    sbtcBalance.textContent = formatBalance(sbtcBal, SBTC_DECIMALS) + " sBTC";
  } catch (error) {
    console.error("Error updating balances:", error);
    showStatus("Failed to fetch balances", true);
  }
}

// Swap function
async function performSwap() {
  const amount = swapAmountInput.value;

  if (!amount || parseFloat(amount) <= 0) {
    showStatus("Please enter a valid amount", true);
    return;
  }

  const userData = getLocalStorage();
  const userAddress = userData.addresses.stx[0].address;
  const amountInSats = parseAmount(amount, XBTC_DECIMALS);

  try {
    swapBtn.disabled = true;
    swapBtn.textContent = "Processing...";

    await request("stx_callContract", {
      contract: SWAP_CONTRACT,
      functionName: "xbtc-to-sbtc-swap",
      functionArgs: [Cl.uint(amountInSats)],
      postConditionMode: "deny",
      postConditions: [
        Pc.principal(userAddress)
          .willSendEq(amountInSats)
          .ft(XBTC_CONTRACT, "wrapped-bitcoin"),
        Pc.principal(SWAP_CONTRACT)
          .willSendEq(amountInSats)
          .ft(SBTC_CONTRACT, "sbtc-token"),
      ],
    });

    console.log("Transaction submitted:", data);
    showStatus(`Swap submitted! Transaction ID: ${data.txId}`);
    swapAmountInput.value = "";

    // Wait a bit then refresh balances
    setTimeout(() => {
      updateBalances(userAddress);
    }, 3000);
  } catch (error) {
    console.error("Swap error:", error);
    showStatus(`Swap failed: ${error.message}`, true);
  } finally {
    swapBtn.disabled = false;
    swapBtn.textContent = "Swap xBTC → sBTC";
  }
}

// Event listeners
connectWalletBtn.addEventListener("click", connectWallet);
disconnectBtn.addEventListener("click", disconnectWallet);
swapBtn.addEventListener("click", performSwap);

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
