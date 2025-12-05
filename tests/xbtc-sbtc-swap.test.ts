import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, test } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

const initalBalance = {
  wallet1Xbtc: 10_000,
  wallet1Sbtc: 10_00_000_000, // 10 sBTC
  contractXbtc: 0,
  contractSbtc: 5_000,
};

describe("xBTC-sBTC Swap Contract Tests", () => {
  beforeEach(() => {
    // initialize xBTC contract
    simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "initialize",
      [
        Cl.stringAscii("Wrapped BTC"),
        Cl.stringAscii("xBTC"),
        Cl.uint(8),
        Cl.principal(deployer),
      ],
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR"
    );
    // set minter and burner role to deployer
    simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "add-principal-to-role",
      [Cl.uint(1), Cl.principal(deployer)],
      deployer
    );
    simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "add-principal-to-role",
      [Cl.uint(2), Cl.principal(deployer)],
      deployer
    );

    // mint xBTC to wallet1
    simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "mint-tokens",
      [Cl.uint(initalBalance.wallet1Xbtc), Cl.principal(wallet1)],
      deployer
    );

    // Fund the swap contract with sBTC
    simnet.callPublicFn(
      "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      "transfer",
      [
        Cl.uint(initalBalance.contractSbtc),
        Cl.principal(deployer),
        Cl.principal(`${deployer}.xbtc-sbtc-swap`),
        Cl.none(),
      ],
      deployer
    );
  });

  test("that user can swap xBTC for sBTC", () => {
    const amount = 1000;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount)],
      wallet1
    );

    expect(response.result).toBeOk(Cl.bool(true));
    expect(response.events).toHaveLength(3);

    const sbtcTransferEvent = response.events[0];
    expect(sbtcTransferEvent).toMatchObject({
      event: "ft_transfer_event",
      data: {
        amount: amount.toString(),
        asset_identifier:
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token",
        recipient: "ST1SJ3DTE5DN7X54YDH5D64R3BCB6A2AG2ZQ8YPD5",
        sender: "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.xbtc-sbtc-swap",
      },
    });

    const xbtcTransferEvent = response.events[2];
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

    // user sent amount of xBTC and received sBTC
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + amount);

    // contract received amount of xBTC and sent out sBTC
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(initalBalance.contractXbtc + amount);
    expectSbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(initalBalance.contractSbtc - amount);


    // burn xBTC from contract
    const responseBurn = simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "burn-tokens",
      [Cl.uint(amount), Cl.principal(`${deployer}.xbtc-sbtc-swap`)],
      deployer
    );
    expect(responseBurn.result).toBeOk(Cl.bool(true));
    
    // contract xBTC balance back to initial zero
    expectXbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(initalBalance.contractXbtc);
    
  });

  test("that user't can swap more xBTC than sBTC in the contract", () => {
    const amount = initalBalance.contractSbtc + 1000;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount)],
      wallet1
    );

    expect(response.result).toBeErr(Cl.uint(501));
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc);
  });

  test("that user't can swap more xBTC than owned", async () => {
    const amount = initalBalance.wallet1Xbtc + 1000;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount)],
      wallet1
    );

    expect(response.result).toBeErr(Cl.uint(500));

    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc);
  });

  test("that user't can swap zero xBTC", async () => {
    const amount = 0;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount)],
      wallet1
    );

    expect(response.result).toBeErr(Cl.uint(3)); // non-positive amount
  });

  test("that user can swap exactly all contract sBTC", () => {
    const amount = initalBalance.contractSbtc; // exact contract balance
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount)],
      wallet1
    );

    expect(response.result).toBeOk(Cl.bool(true));
    expectSbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(0);
  });

  test("that user can perform multiple sequential swaps", () => {
    const amount1 = 1000;
    const amount2 = 2000;

    // First swap
    const response1 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount1)],
      wallet1
    );
    expect(response1.result).toBeOk(Cl.bool(true));

    // Second swap
    const response2 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount2)],
      wallet1
    );
    expect(response2.result).toBeOk(Cl.bool(true));

    // Verify final balances
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount1 - amount2);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + amount1 + amount2);
  });

  test("that multiple users can swap", () => {
    const amount1 = 1000;
    const amount2 = 2000;

    // Give wallet2 some xBTC
    simnet.callPublicFn(
      "SP3DX3H4FEYZJZ586MFBS25ZW3HZDMEW92260R2PR.Wrapped-Bitcoin",
      "mint-tokens",
      [Cl.uint(amount2), Cl.principal(wallet2)],
      deployer
    );

    // wallet1 swaps
    const response1 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount1)],
      wallet1
    );
    expect(response1.result).toBeOk(Cl.bool(true));

    // wallet2 swaps
    const response2 = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount2)],
      wallet2
    );
    expect(response2.result).toBeOk(Cl.bool(true));

    // Verify balances
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount1);
    expectXbtcBalance(wallet2).toBeUint(0);
    expectSbtcBalance(`${deployer}.xbtc-sbtc-swap`).toBeUint(
      initalBalance.contractSbtc - amount1 - amount2
    );
  });

  test("that user with no xBTC cannot swap", () => {
    // wallet2 has no xBTC
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(1000)],
      wallet2
    );

    expect(response.result).toBeErr(Cl.uint(500));
  });

  test("that minimum amount (1) can be swapped", () => {
    const amount = 1;
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(amount)],
      wallet1
    );

    expect(response.result).toBeOk(Cl.bool(true));
    expectXbtcBalance(wallet1).toBeUint(initalBalance.wallet1Xbtc - amount);
    expectSbtcBalance(wallet1).toBeUint(initalBalance.wallet1Sbtc + amount);
  });

  test("that swap fails when contract has zero sBTC", () => {
    // First drain all sBTC from contract
    const drainAmount = initalBalance.contractSbtc;
    simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(drainAmount)],
      wallet1
    );

    // Now try to swap more - should fail
    const response = simnet.callPublicFn(
      "xbtc-sbtc-swap",
      "xbtc-to-sbtc-swap",
      [Cl.uint(1)],
      wallet1
    );

    expect(response.result).toBeErr(Cl.uint(501));
  });
});

function expectXbtcBalance(user: string) {
  const wallet1Xbtc = simnet.callReadOnlyFn(
    "xbtc-sbtc-swap",
    "get-xbtc-balance",
    [Cl.principal(user)],
    deployer
  );

  return expect(wallet1Xbtc.result);
}


function expectSbtcBalance(user: string) {
  const wallet1Xbtc = simnet.callReadOnlyFn(
    "xbtc-sbtc-swap",
    "get-sbtc-balance",
    [Cl.principal(user)],
    deployer
  );

  return expect(wallet1Xbtc.result);
}
