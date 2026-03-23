import { Cl } from "@stacks/transactions";
import { typedCallPublicFn } from "clarity-abitype/clarinet-sdk";
import { beforeEach, describe, expect, test } from "vitest";
import { abiSbtcToken } from "./abis/abi-sbtc-token";
import { abiXbtcSbtcSwap } from "./abis/abi-xbtc-sbtc-swap";
import {
  depositUnwrapClaim,
  expectSbtcBalance,
  expectSwappingXbtcBalance,
  expectXbtcBalance,
  init,
  initalBalance,
  unwrap,
} from "./utils";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet4 = accounts.get("wallet_4")!;

describe("xBTC-sBTC Swap Contract Tests", () => {
  beforeEach(() => {
    init();
  });

  test("that user can swap xBTC for sBTC up to unwrapped sbtc amount", () => {
    const amount = 1000;
    const fees = 100;
    // contract xBTC balance initally zero
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc,
    );

    depositUnwrapClaim(wallet1, amount, fees);

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(
      initalBalance.wallet1Sbtc + amount - fees,
    );
    // user still has fees
    expectSwappingXbtcBalance(wallet1).toBeUint(fees);

    // contract xBTC balance back to initial zero
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc,
    );
  });

  test("that user can swap xBTC for sBTC up to swapping-xBTC amount", () => {
    const amount = 1000;
    const fees = 100;
    const rewards = 10;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(response.result).toEqual({ ok: true });
    expect(response.events).toHaveLength(3);

    const xbtcTransferEvent = response.events[1];
    expect(xbtcTransferEvent).toMatchObject({
      event: "ft_transfer_event",
      data: {
        amount: amount.toString(),
        asset_identifier:
          "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin::wrapped-bitcoin",
        recipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.xbtc-sbtc-swap",
        sender: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
      },
    });

    // user sent amount of xBTC and received swappingXBTC
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSwappingXbtcBalance(wallet1).toBeUint(
      initalBalance.wallet1SwappingXbtc + amount,
    );

    // contract received amount of xBTC
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc + amount,
    );

    // dual stacking sends sBTC to contract
    typedCallPublicFn({
      simnet,
      abi: abiSbtcToken as any,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [rewards, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });

    // user claims sBTC by burning swappingXBTC
    const claimResponse1 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    expect(claimResponse1.result).toEqual({ ok: true });

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + rewards);
    expectSwappingXbtcBalance(wallet1).toBeUint(amount - rewards);

    // contract xBTC balance still has all xBTC
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc + amount,
    );

    // contract sends xBTC to custodian
    typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: ".xbtc-sbtc-swap",
      functionName: "init-unwrap",
      functionArgs: [],
      sender: deployer,
    });

    // custodian sends sBTC to contract
    typedCallPublicFn({
      simnet,
      abi: abiSbtcToken as any,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [amount - fees, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });

    // user claims sBTC by burning swappingXBTC
    const claimResponse2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    expect(claimResponse2.result).toEqual({ ok: true });

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(
      initalBalance.wallet1Sbtc + rewards + amount - fees,
    );
    expectSwappingXbtcBalance(wallet1).toBeUint(fees - rewards);
  });

  test("that user can't deposit more xBTC than owned", async () => {
    const amount = initalBalance.wallet1Xbtc + 1000;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(response.result).toEqual({ error: 1n });

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc);
  });

  test("that user can't deposit zero xBTC", async () => {
    const amount = 0;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(response.result).toEqual({ error: 3n }); // non-positive amount
  });

  test("that user can perform multiple sequential deposits ", () => {
    const amount1 = 1000;
    const amount2 = 2000;

    // First deposit
    const response1 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount1],
      sender: wallet1,
    });
    expect(response1.result).toEqual({ ok: true });

    // Second deposit
    const response2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount2],
      sender: wallet1,
    });
    expect(response2.result).toEqual({ ok: true });

    // Verify final balances
    expectXbtcBalance(wallet1).toBeUint(
      initalBalance.wallet1Xbtc - amount1 - amount2,
    );
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc + amount1 + amount2,
    );
  });

  test("that multiple users can deposit", () => {
    const amount1 = 1000;
    const amount2 = 2000;

    // Give wallet2 some xBTC
    simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "mint-tokens",
      [Cl.uint(amount2), Cl.principal(wallet2)],
      deployer,
    );

    // wallet1 deposits
    const response1 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount1],
      sender: wallet1,
    });
    expect(response1.result).toEqual({ ok: true });

    // wallet2 deposits
    const response2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount2],
      sender: wallet2,
    });
    expect(response2.result).toEqual({ ok: true });

    // Verify balances
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount1);
    expectXbtcBalance(wallet2).toBeUint(0);
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc + amount1 + amount2,
    );
  });

  test("that user with no xBTC cannot swap", () => {
    // wallet2 has no xBTC
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [1000],
      sender: wallet2,
    });

    expect(response.result).toEqual({ error: 1n });
  });

  test("that minimum amount (1) can be swapped", () => {
    const amount = 1;
    depositUnwrapClaim(wallet1, amount, 0);

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + amount);
  });

  test("that user can withdraw their xBTC before unwrap was initialized", () => {
    const amount = 1000;
    let response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });
    expect(response.events).toHaveLength(3);

    const xbtcTransferEvent = response.events[1];
    expect(xbtcTransferEvent).toMatchObject({
      event: "ft_transfer_event",
      data: {
        amount: amount.toString(),
        asset_identifier:
          "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin::wrapped-bitcoin",
        recipient: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.xbtc-sbtc-swap",
        sender: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
      },
    });

    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });
  });

  test("that user can withdraw their xBTC after unwrap was initialized and second user deposited", () => {
    const amount1 = 1000;
    const fees = 100;
    const amount4 = 500;
    depositUnwrapClaim(wallet1, amount1, fees);

    let response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount4],
      sender: wallet4,
    });
    expect(response.result).toEqual({ ok: true });

    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-xbtc",
      functionArgs: [fees],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });
    expect(response.events).toHaveLength(3);

    const xbtcTransferEvent = response.events[2];
    expect(xbtcTransferEvent).toMatchObject({
      event: "ft_transfer_event",
      data: {
        amount: fees.toString(),
        asset_identifier:
          "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin::wrapped-bitcoin",
        sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.xbtc-sbtc-swap",
        recipient: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
      },
    });
  });

  test("that user can't withdraw xBTC after unwrap was initialized and after less sbtc received", () => {
    const amount = 1000;
    depositUnwrapClaim(wallet1, amount, 100);

    let response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-xbtc",
      functionArgs: [100],
      sender: wallet1,
    });
    // fees can't be recovered by withdrawing xBTC
    expect(response.result).toEqual({ error: 511n });
  });

  test("that user two users can deposit and claim", () => {
    const amount1 = 1000;
    const amount4 = 2000;

    let response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount1],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });
    response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap as any,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount4],
      sender: wallet4,
    });
    expect(response.result).toEqual({ ok: true });

    unwrap(amount1  + amount4);

    
  });
});
