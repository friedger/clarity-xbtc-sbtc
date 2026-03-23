import {
  typedCallPublicFn,
  typedCallReadOnlyFn,
} from "clarity-abitype/clarinet-sdk";
import { beforeEach, describe, expect, test } from "vitest";
import { abiSbtcToken } from "./abis/abi-sbtc-token";
import { abiXbtcSbtcSwap } from "./abis/abi-xbtc-sbtc-swap";
import {
  expectSbtcBalance,
  expectSbtcTransfer,
  init,
  initalBalance,
} from "./utils";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("xBTC-sBTC Swap Contract Withdrawal Tests", () => {
  beforeEach(() => {
    init();
  });

  test("that user can withdraw excess sBTC", () => {
    const amount = 1000n;
    const excessSbtc = 3333n;

    // create swapping-xbtc supply
    const depositResponse = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(depositResponse.result).toEqual({ ok: true });

    // Fund the swap contract with more sBTC than swapping-xBTC supply
    let response = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [excessSbtc, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });

    expect(response.result).toEqual({ ok: true });

    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    expect(response.result).toEqual({ ok: true });
    expect(response.events).toHaveLength(1);

    const expectedExcessAmount = excessSbtc - amount;

    expectSbtcTransfer(response.events[0], {
      amount: expectedExcessAmount.toString(),
      sender: `${deployer}.xbtc-sbtc-swap`,
      recipient: "SP2PABAF9FTAJYNFZH93XENAJ8FVY99RRM50D2JG9.xbtc-swap-wallet",
    });
  });

  test("that withdrawal fails when no excess sBTC exists", () => {
    // initial setup has no excess sBTC

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    // Should fail with error u513 (no excess)
    expect(response.result).toEqual({ error: 513n });
  });

  test("that anyone can call withdraw-excess-sbtc", () => {
    // Add excess sBTC to contract
    const extraSbtc = 1000n;
    let response = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [extraSbtc, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });
    expect(response.result).toEqual({ ok: true });

    // wallet2 (random user) can trigger withdrawal
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet2,
    });
    expect(response.result).toEqual({ ok: true });
  });

  test("that excess sBTC is sent to endowment address not caller", () => {
    // Add excess sBTC
    const extraSbtc = 10000n;
    let response = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [extraSbtc, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });
    expect(response.result).toEqual({ ok: true });

    const wallet1SbtcBefore = initalBalance.wallet1Sbtc;
    expectSbtcBalance(wallet1).toBeUint(wallet1SbtcBefore);

    // wallet1 calls withdraw
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });

    // wallet1's sBTC balance should be unchanged (funds go to endowment)
    const wallet1SbtcAfter = typedCallReadOnlyFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "get-sbtc-balance",
      functionArgs: [wallet1],
      sender: wallet1,
    }).result;

    expect(wallet1SbtcAfter).toEqual(BigInt(wallet1SbtcBefore));
  });

  test("that second withdrawal fails after excess already withdrawn", () => {
    // Add excess sBTC
    const extraSbtc = 10_000n;
    let response = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [extraSbtc, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });
    expect(response.result).toEqual({ ok: true });

    // First withdrawal succeeds
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });

    // Second withdrawal should fail (no more excess)
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet2,
    });
    expect(response.result).toEqual({ error: 513n });
  });
});
