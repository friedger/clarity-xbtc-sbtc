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
  sendSbtcToContract,
  unwrap,
} from "./utils";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;
const wallet3 = accounts.get("wallet_3")!; // admin for unwrap
const wallet4 = accounts.get("wallet_4")!;

describe("xBTC-sBTC Swap Contract Tests", () => {
  beforeEach(() => {
    init();
  });

  test("that user can swap xBTC for sBTC up to unwrapped sbtc amount", () => {
    const amount = 1000;
    const fees = 100;
    // contract xBTC balance initally zero
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(0);

    depositUnwrapClaim(wallet1, amount, fees);

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(
      initalBalance.wallet1Sbtc + amount - fees,
    );
    // user still has fees
    expectSwappingXbtcBalance(wallet1).toBeUint(fees);

    // contract xBTC balance back to initial zero
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(0);
  });

  test("that user can swap xBTC for sBTC up to swapping-xBTC amount", () => {
    const amount = 1000n;
    const fees = 100n;
    const rewards = 10n;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
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
    expectXbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Xbtc) - amount);
    expectSwappingXbtcBalance(wallet1).toBeUint(
      BigInt(initalBalance.wallet1SwappingXbtc) + amount,
    );

    // contract received amount of xBTC
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(amount);

    // dual stacking sends sBTC to contract
    sendSbtcToContract(rewards);

    
    // user claims sBTC by burning swappingXBTC
    const claimResponse1 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    expect(claimResponse1.result).toEqual({ ok: true });

    expectXbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Xbtc) - amount);
    // swxbtc swapped for sBTC
    expectSbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Sbtc) + rewards);
    expectSwappingXbtcBalance(wallet1).toBeUint(amount - rewards);

    // contract xBTC balance still has all xBTC, but no SWXBTC
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(amount);
    expectSbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(0);

    // unwrap admin calls moves xBTC out of contract
    const unwrapResponse = simnet.callPublicFn(
      ".xbtc-sbtc-swap",
      "init-unwrap",
      [],
      wallet3,
    );
    expect(unwrapResponse.result).toBeOk(Cl.bool(true));

    // custodian sends sBTC to contract
    typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [
        amount - fees,
        deployer,
        `${deployer}.xbtc-sbtc-swap`,
        null,
      ],
      sender: deployer,
    });

    // user claims sBTC by burning swappingXBTC
    const claimResponse2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });

    expect(claimResponse2.result).toEqual({ ok: true });

    expectXbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Xbtc) - amount);
    expectSbtcBalance(wallet1).toBeUint(
      BigInt(initalBalance.wallet1Sbtc) + rewards + amount - fees,
    );
    expectSwappingXbtcBalance(wallet1).toBeUint(fees - rewards);
  });

  test("that user can't deposit more xBTC than owned", async () => {
    const amount = BigInt(initalBalance.wallet1Xbtc) + 1000n;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(response.result).toEqual({ error: 1n });

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc);
  });

  test("that user can't deposit zero xBTC", async () => {
    const amount = 0n;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });

    expect(response.result).toEqual({ error: 3n }); // non-positive amount
  });

  test("that user can perform multiple sequential deposits ", () => {
    const amount1 = 1000n;
    const amount2 = 2000n;

    // First deposit
    const response1 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount1],
      sender: wallet1,
    });
    expect(response1.result).toEqual({ ok: true });

    // Second deposit
    const response2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount2],
      sender: wallet1,
    });
    expect(response2.result).toEqual({ ok: true });

    // Verify final balances
    expectXbtcBalance(wallet1).toBeUint(
      BigInt(initalBalance.wallet1Xbtc) - amount1 - amount2,
    );
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(amount1 + amount2);
  });

  test("that multiple users can deposit", () => {
    const amount1 = 1000n;
    const amount2 = 2000n;

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
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount1],
      sender: wallet1,
    });
    expect(response1.result).toEqual({ ok: true });

    // wallet2 deposits
    const response2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount2],
      sender: wallet2,
    });
    expect(response2.result).toEqual({ ok: true });

    // Verify balances
    expectXbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Xbtc) - amount1);
    expectXbtcBalance(wallet2).toBeUint(0);
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(amount1 + amount2);
  });

  test("that user with no xBTC cannot swap", () => {
    // wallet2 has no xBTC
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [1000n],
      sender: wallet2,
    });

    expect(response.result).toEqual({ error: 1n });
  });

  test("that minimum amount (1) can be swapped", () => {
    const amount = 1;
    depositUnwrapClaim(wallet1, amount, 0);

    expectXbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Xbtc) - BigInt(amount));
    expectSbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Sbtc) + BigInt(amount));
  });

  test("that user can withdraw their xBTC before unwrap was initialized", () => {
    const amount = 1000n;
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
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

    const responseWithdrawXbtc = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-xbtc",
      functionArgs: [amount],
      sender: wallet1,
    });
    expect(responseWithdrawXbtc.result).toEqual({ ok: true });
  });

  test("that user can withdraw their xBTC after unwrap was initialized and second user deposited", () => {
    const amount1 = 1000n;
    const fees = 100n;
    const amount4 = 500n;
    depositUnwrapClaim(wallet1, amount1, fees);

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount4],
      sender: wallet4,
    });
    expect(response.result).toEqual({ ok: true });

    const responseWithdrawXbtc = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-xbtc",
      functionArgs: [fees],
      sender: wallet1,
    });
    expect(responseWithdrawXbtc.result).toEqual({ ok: true });
    expect(responseWithdrawXbtc.events).toHaveLength(3);

    const xbtcTransferEvent = responseWithdrawXbtc.events[2];
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
    const amount = 1000n;
    depositUnwrapClaim(wallet1, amount, 100n);

    let response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "withdraw-xbtc",
      functionArgs: [100n],
      sender: wallet1,
    });
    // fees can't be recovered by withdrawing xBTC
    expect(response.result).toEqual({ error: 511n });
  });

  test("that two users can deposit and claim", () => {
    const amount1 = 1000n;
    const amount4 = 2000n;

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount1],
      sender: wallet1,
    });
    expect(response.result).toEqual({ ok: true });
    const response2 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [amount4],
      sender: wallet4,
    });
    expect(response2.result).toEqual({ ok: true });

    unwrap(amount1 + amount4, 0);
    const response3 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });
    expect(response3.result).toEqual({ ok: true });
    expectSbtcBalance(wallet1).toBeUint(BigInt(initalBalance.wallet1Sbtc) + amount1);
    const response4 = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet4,
    });
    expect(response4.result).toEqual({ ok: true });
    expectSbtcBalance(wallet4).toBeUint(BigInt(initalBalance.wallet1Sbtc) + amount4);
  });

  test("that user can't claim sbtc without depositing xBTC", () => {
    sendSbtcToContract(1000n); 
    
    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });
    expect(response.result).toEqual({ error: 514n });
  });

  test("that user can't claim sbtc if none in the contract", () => {
    const responseDeposit = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "deposit-xbtc",
      functionArgs: [1000n],
      sender: wallet1,
    });
    expect(responseDeposit.result).toEqual({ ok: true });

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "claim-sbtc",
      functionArgs: [],
      sender: wallet1,
    });
    expect(response.result).toEqual({ error: 514n });
  });
});
