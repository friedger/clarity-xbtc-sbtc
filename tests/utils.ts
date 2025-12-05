import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, test } from "vitest";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

export const initalBalance = {
  wallet1Xbtc: 10_000,
  wallet1Sbtc: 10_00_000_000, // 10 sBTC
  contractXbtc: 0,
  contractSbtc: 5_000,
};

export function init() {
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
}

export function expectXbtcBalance(user: string) {
  const wallet1Xbtc = simnet.callReadOnlyFn(
    "xbtc-sbtc-swap",
    "get-xbtc-balance",
    [Cl.principal(user)],
    deployer
  );

  return expect(wallet1Xbtc.result);
}

export function expectSbtcBalance(user: string) {
  const wallet1Xbtc = simnet.callReadOnlyFn(
    "xbtc-sbtc-swap",
    "get-sbtc-balance",
    [Cl.principal(user)],
    deployer
  );

  return expect(wallet1Xbtc.result);
}


export function expectSbtcTransfer(event: any, {amount, sender, recipient}: {
    amount:string,
    sender: string,
    recipient: string,
}) {
    return expect(event).toMatchObject({
      event: "ft_transfer_event",
      data: {
        amount,
        asset_identifier:
          "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token::sbtc-token",
        recipient,
        sender
      },
    });
}