import { typedCallPublicFn } from "clarity-abitype/clarinet-sdk";
import { beforeEach, describe, expect, test } from "vitest";
import { abiSbtcToken } from "./abis/abi-sbtc-token";
import { abiXbtcSbtcSwap } from "./abis/abi-xbtc-sbtc-swap";
import { init, initalBalance } from "./utils";

const accounts = simnet.getAccounts();
const deployer = accounts.get("deployer")!;
const wallet1 = accounts.get("wallet_1")!;
const wallet2 = accounts.get("wallet_2")!;

describe("xBTC-sBTC Swap Contract Enroll Tests", () => {
  beforeEach(() => {
    init();
  });

  test("that deployer can enroll to dual stacking", () => {
    // Fund the swap contract with some sBTC
    let responseFund = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [
        BigInt(initalBalance.wallet1Sbtc),
        deployer,
        `${deployer}.xbtc-sbtc-swap`,
        null,
      ],
      sender: deployer,
    });

    expect(responseFund.result).toEqual({ ok: true });

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "enroll",
      functionArgs: [
        "SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v2_0_4",
        null,
      ],
      sender: deployer,
    });

    expect(response.result).toEqual({ ok: true });
    expect(response.events).toHaveLength(1);

    const enrollEvent = response.events[0];
    expect(enrollEvent.event).toBe("print_event");
    expect((enrollEvent.data.value as any).value["enrolled-address"].value).toEqual(
      "ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.xbtc-sbtc-swap",
    );
  });

  test("that deployer can't enroll to dual stacking if low balance", () => {
    // Fund the swap contract with less sbtc than threshold
    let responseFund = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [1n, deployer, `${deployer}.xbtc-sbtc-swap`, null],
      sender: deployer,
    });

    expect(responseFund.result).toEqual({ ok: true });

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "enroll",
      functionArgs: [
        "SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v2_0_4",
        null,
      ],
      sender: deployer,
    });

    expect(response.result).toEqual({ error: 104n });
  });

  test("that user can't enroll to dual stacking", () => {
    // Fund the swap contract with some sBTC
    let responseFund = typedCallPublicFn({
      simnet,
      abi: abiSbtcToken,
      contract: "SM3VDXK3WZZSA84XXFKAFAF15NNZX32CTSG82JFQ4.sbtc-token",
      functionName: "transfer",
      functionArgs: [
        BigInt(initalBalance.wallet1Sbtc),
        deployer,
        `${deployer}.xbtc-sbtc-swap`,
        null,
      ],
      sender: deployer,
    });

    expect(responseFund.result).toEqual({ ok: true });

    const response = typedCallPublicFn({
      simnet,
      abi: abiXbtcSbtcSwap,
      contract: "xbtc-sbtc-swap",
      functionName: "enroll",
      functionArgs: [
        "SP1HFCRKEJ8BYW4D0E3FAWHFDX8A25PPAA83HWWZ9.dual-stacking-v2_0_4",
        null,
      ],
      sender: wallet1,
    });

    expect(response.result).toEqual({ error: 401n });
  });
});
