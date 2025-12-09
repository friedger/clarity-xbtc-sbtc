import { Cl } from "@stacks/transactions";
import { beforeEach, describe, expect, test } from "vitest";
import {
  init,
  initalBalance
} from "./utils";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("xBTC-sBTC Swap Contract Enroll Tests", () => {
  beforeEach(() => {
    init();
  });

  test("that user can enroll to dual stacking", () => {
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
      "enroll",
      [
        Cl.principal(
          "SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v1"
        ),
        Cl.none(),
      ],
      wallet1
    );

    expect(response.result).toBeOk(Cl.bool(true));
    expect(response.events).toHaveLength(1);

    const enrollEvent = response.events[0];
    expect(enrollEvent.event).toBe("print_event");
    expect(enrollEvent.data.value.value["enrolled-address"].value).toBe(
      "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.xbtc-sbtc-swap"
    );
  });
});
