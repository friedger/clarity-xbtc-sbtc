import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, test } from "vitest";
import {
  depositUnwrapClaim,
  expectSbtcBalance,
  expectSbtcTransfer,
  expectXbtcBalance,
  init,
  initalBalance,
} from "./utils";
import { typedCallPublicFn, typedCallReadOnlyFn } from "clarity-abitype/clarinet-sdk";
import { abiXbtcSbtcSwap } from "./abis/abi-xbtc-sbtc-swap";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("xBTC-sBTC Swap Contract Withdrawal Tests", () => {
  beforeEach(() => {
    init();
  });

  test("that user can withdraw excess sBTC", () => {
    const amount = 1000;
    const excessSbtc = 3333;

    // create swapping-xbtc supply
    const depositResponse = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(depositResponse.result).toEqual({ok: true});
    // Fund the swap contract with more sBTC than swapping-xBTC supply
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(excessSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer,
    );

    expect(response.result).toBeOk(Cl.bool(true));

    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1,
    );

    expect(response.result).toBeOk(Cl.bool(true));
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
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    // Should fail with error u514 (no excess)
    expect(response.result).toEqual({error: 513n});
  });

  test("that anyone can call withdraw-excess-sbtc", () => {
    // Add excess sBTC to contract
    const extraSbtc = 1000;
    let response = simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(extraSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer,
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // wallet2 (random user) can trigger withdrawal
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet2,
    });
    expect(response.result).toEqual({ok: true});
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
      deployer,
    );
    expect(response.result).toBeOk(Cl.bool(true));

    const wallet1SbtcBefore = initalBalance.wallet1Sbtc;
    expectSbtcBalance(wallet1).toBeUint(wallet1SbtcBefore);

    // wallet1 calls withdraw
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-excess-sbtc",
      functionArgs: [],
      sender: wallet1,
    });
    expect(response.result).toEqual({ok: true});

    // wallet1's sBTC balance should be unchanged (funds go to endowment)
    const wallet1SbtcAfter = typedCallReadOnlyFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "get-sbtc-balance",
      functionArgs: [wallet1],
      sender: wallet1,
    }).result;

    expect(wallet1SbtcAfter).toEqual(BigInt(wallet1SbtcBefore));
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
      deployer,
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // First withdrawal succeeds
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet1,
    );
    expect(response.result).toBeOk(Cl.bool(true));

    // Second withdrawal should fail (no more excess)
    response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "withdraw-excess-sbtc",
      [],
      wallet2,
    );
    expect(response.result).toBeErr(Cl.uint(513));
  });
});
