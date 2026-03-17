import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, test } from "vitest";
import {
  depositUnwrapClaim,
  expectSbtcBalance,
  expectSwappingXbtcBalance,
  expectXbtcBalance,
  init,
  initalBalance,
} from "./utils";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

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
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount)],
      wallet1,
    );

    expect(response.result).toBeOk(Cl.bool(true));
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
    simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(rewards),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer,
    );

    // user claims sBTC by burning swappingXBTC
    const claimResponse1 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "claim-sbtc",
      [],
      wallet1,
    );

    expect(claimResponse1.result).toBeOk(Cl.bool(true));

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + rewards);
    expectSwappingXbtcBalance(wallet1).toBeUint(amount - rewards);

    // contract xBTC balance still has all xBTC
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc + amount,
    );

    // contract sends xBTC to custodian
    simnet.callPublicFn(".xbtc-sbtc-swap", "init-unwrap", [], deployer);

    // custodian sends sBTC to contract
    simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(amount - fees),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer,
    );

    // user claims sBTC by burning swappingXBTC
    const claimResponse2 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "claim-sbtc",
      [],
      wallet1,
    );

    expect(claimResponse2.result).toBeOk(Cl.bool(true));

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(
      initalBalance.wallet1Sbtc + rewards + amount - fees,
    );
    expectSwappingXbtcBalance(wallet1).toBeUint(fees - rewards);
  });

  test("that user can't deposit more xBTC than owned", async () => {
    const amount = initalBalance.wallet1Xbtc + 1000;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount)],
      wallet1,
    );

    expect(response.result).toBeErr(Cl.uint(1));

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc);
  });

  test("that user can't deposit zero xBTC", async () => {
    const amount = 0;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount)],
      wallet1,
    );

    expect(response.result).toBeErr(Cl.uint(3)); // non-positive amount
  });

  test("that user can perform multiple sequential deposits ", () => {
    const amount1 = 1000;
    const amount2 = 2000;

    // First deposit
    const response1 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount1)],
      wallet1,
    );
    expect(response1.result).toBeOk(Cl.bool(true));

    // Second deposit
    const response2 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount2)],
      wallet1,
    );
    expect(response2.result).toBeOk(Cl.bool(true));

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
    const response1 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount1)],
      wallet1,
    );
    expect(response1.result).toBeOk(Cl.bool(true));

    // wallet2 deposits
    const response2 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(amount2)],
      wallet2,
    );
    expect(response2.result).toBeOk(Cl.bool(true));

    // Verify balances
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount1);
    expectXbtcBalance(wallet2).toBeUint(0);
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractXbtc + amount1 + amount2,
    );
  });

  test("that user with no xBTC cannot swap", () => {
    // wallet2 has no xBTC
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "deposit-xbtc",
      [Cl.uint(1000)],
      wallet2,
    );

    expect(response.result).toBeErr(Cl.uint(1));
  });

  test("that minimum amount (1) can be swapped", () => {
    const amount = 1;
    depositUnwrapClaim(wallet1, amount, 0);

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + amount);
  });
});
