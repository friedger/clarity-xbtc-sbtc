import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, test } from "vitest";
import {
  expectSbtcBalance,
  expectSbtcTransfer,
  expectXbtcBalance,
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
    // Fund the swap contract with more sBTC than xBTC supply
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(initalBalance.wallet1Xbtc), // contract has already some sBTC
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );

    expect(response.result).toBeOk(Cl.bool(true));

    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1
    );

    expect(response.result).toBeOk(Cl.bool(true));
    expect(response.events).toHaveLength(1);

    const expectedExcessAmount =
      initalBalance.contractSbtc +
      initalBalance.wallet1Xbtc -
      initalBalance.wallet1Xbtc;

    expectSbtcTransfer(response.events[0], {
      amount: expectedExcessAmount.toString(),
      sender: `${deployer}.xbtc-sbtc-swap`,
      recipient: "SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045",
    });
  });

  test("that user can swap all xBTC then another user withdraws excess", () => {
    // First, add extra sBTC to contract (more than xBTC supply)
    const accessSbtc = 1000;
    const extraSbtc =
      initalBalance.wallet1Xbtc - initalBalance.contractSbtc + accessSbtc;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // wallet1 swaps all their xBTC
    const swapAmount = initalBalance.wallet1Xbtc;
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(swapAmount)],
      wallet1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // Verify wallet1 has no xBTC left
    expectXbtcBalance(wallet1).toBeUint(0);

    // Now wallet2 withdraws the excess sBTC
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet2
    );
    expect(response.result).toBeOk(Cl.bool(true));
    expectSbtcTransfer(response.events[0], {
      amount: accessSbtc.toString(),
      sender: `${deployer}.xbtc-sbtc-swap`,
      recipient: "SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045",
    });
  });

  test("that withdrawal fails when no excess sBTC exists", () => {
    // initial setup has no excess sBTC

    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1
    );

    // Should fail with error u502 (no excess)
    expect(response.result).toBeErr(Cl.uint(502));
  });

  test("that withdrawal fails when sBTC equals liquid xBTC exactly", () => {
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(initalBalance.wallet1Xbtc - initalBalance.contractSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1
    );

    // Should fail because we need strictly greater than
    expect(response.result).toBeErr(Cl.uint(502));
  });

  test("that anyone can call withdraw-excess-sbtc", () => {
    // Add excess sBTC to contract
    const extraSbtc = initalBalance.wallet1Xbtc + 1000;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // wallet2 (random user) can trigger withdrawal
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet2
    );
    expect(response.result).toBeOk(Cl.bool(true));
  });

  test("that excess sBTC is sent to endowment address not caller", () => {
    // Add excess sBTC
    const extraSbtc = 10000;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    const wallet1SbtcBefore = initalBalance.wallet1Sbtc;
    expectSbtcBalance(wallet1).toBeUint(wallet1SbtcBefore);

    // wallet1 calls withdraw
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // wallet1's sBTC balance should be unchanged (funds go to endowment)
    const wallet1SbtcAfter = simnet.callReadOnlyFn(
      "xbtc-sbtc-swap",
      "get-sbtc-balance",
      [Cl.principal(wallet1)],
      wallet1
    ).result;

    expect(wallet1SbtcAfter).toBeUint(wallet1SbtcBefore);
  });

  test("that partial swap followed by withdrawal works correctly", () => {
    // Add excess sBTC to contract
    const extraSbtc = 20000;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // wallet1 does a partial swap (half their xBTC)
    const partialSwap = Math.floor(initalBalance.wallet1Xbtc / 2);
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(partialSwap)],
      wallet1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // Now withdraw excess
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet2
    );
    expect(response.result).toBeOk(Cl.bool(true));
    expectSbtcTransfer(response.events[0], {
      amount: "15000", // 20k extra sbtc - 5k remaining backed sbtc
      sender: `${deployer}.xbtc-sbtc-swap`,
      recipient: "SM1Z6BP8PDKYKXTZXXSKXFEY6NQ7RAM7DAEAYR045",
    });

    // Verify contract still has enough sBTC for remaining liquid xBTC
    const contractSbtc = simnet.callReadOnlyFn(
      "xbtc-sbtc-swap",
      "get-sbtc-balance",
      [Cl.principal(`${deployer}.xbtc-sbtc-swap`)],
      deployer
    ).result;

    // Remaining liquid xBTC = initial - partialSwap (burned)
    const remainingLiquidXbtc = initalBalance.wallet1Xbtc - partialSwap;
    expect(contractSbtc).toBeUint(remainingLiquidXbtc);
  });

  test("that second withdrawal fails after excess already withdrawn", () => {
    // Add excess sBTC
    const extraSbtc = 10_000;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // First withdrawal succeeds
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // Second withdrawal should fail (no more excess)
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet2
    );
    expect(response.result).toBeErr(Cl.uint(502));
  });

  test("that swap still works after withdrawal", () => {
    // Add excess sBTC (more than needed for swaps)
    const extraSbtc = 20000;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // Withdraw excess first
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // Swap should still work (contract has exactly enough sBTC for liquid xBTC)
    const swapAmount = 1000;
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(swapAmount)],
      wallet1
    );
    expect(response.result).toBeOk(Cl.bool(true));

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - swapAmount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + swapAmount);
    expectSbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.wallet1Xbtc - swapAmount
    );
  });
});
