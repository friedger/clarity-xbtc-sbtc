import { describe, it } from "vitest";
import * as fs from "fs";

function toCamelCase(input: string): string {
  return input.toLowerCase().replace(/-(.)/g, function (match, group1) {
    return group1.toUpperCase();
  });
}

function writeAbi(abi: Map<string, any>, name: string) {
  const variableName = toCamelCase(`abi-${name}`);
  fs.writeFileSync(
    `tests/abis/abi-${name}.ts`,
    `export const ${variableName} = ${JSON.stringify(abi.get(`ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.${name}`), null, 2)} as const;
`,
  );
}

describe("ABI generation", () => {
  it("should generate ABI for all contracts", () => {
    const abi: Map<string, any> = simnet.getContractsInterfaces();
    // write interface to file
    writeAbi(abi, "swapping-xbtc");
    writeAbi(abi, "xbtc-sbtc-swap");
  });
});
