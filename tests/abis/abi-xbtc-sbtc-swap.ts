export const abiXbtcSbtcSwap = {
  "functions": [
    {
      "name": "transfer-sbtc-to",
      "access": "private",
      "args": [
        {
          "name": "amount",
          "type": "uint128"
        },
        {
          "name": "sbtc-recipient",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "claim-sbtc",
      "access": "public",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "deposit-xbtc",
      "access": "public",
      "args": [
        {
          "name": "amount",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "enroll",
      "access": "public",
      "args": [
        {
          "name": "enroll-contract",
          "type": "trait_reference"
        },
        {
          "name": "receiver",
          "type": {
            "optional": "principal"
          }
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "init-unwrap",
      "access": "public",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "initialize",
      "access": "public",
      "args": [
        {
          "name": "custodian-address",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "withdraw-excess-sbtc",
      "access": "public",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "withdraw-xbtc",
      "access": "public",
      "args": [
        {
          "name": "amount",
          "type": "uint128"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "bool",
            "error": "uint128"
          }
        }
      }
    },
    {
      "name": "get-sbtc-balance",
      "access": "read_only",
      "args": [
        {
          "name": "user",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-swapping-xbtc-balance",
      "access": "read_only",
      "args": [
        {
          "name": "user",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-swapping-xbtc-supply",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": "uint128"
      }
    },
    {
      "name": "get-xbtc-balance",
      "access": "read_only",
      "args": [
        {
          "name": "user",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": "uint128"
      }
    }
  ],
  "variables": [
    {
      "name": "deployer",
      "type": "principal",
      "access": "constant"
    },
    {
      "name": "err-forbidden",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "err-no-excess-sbtc",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "err-not-enough-swapping-xbtc",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "err-not-enough-xbtc",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "err-not-initialized",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "err-unauthorized",
      "type": {
        "response": {
          "ok": "none",
          "error": "uint128"
        }
      },
      "access": "constant"
    },
    {
      "name": "excess-sbtc-receiver",
      "type": "principal",
      "access": "constant"
    },
    {
      "name": "custodian",
      "type": {
        "optional": "principal"
      },
      "access": "variable"
    }
  ],
  "maps": [],
  "fungible_tokens": [],
  "non_fungible_tokens": [],
  "epoch": "Epoch33",
  "clarity_version": "Clarity4"
} as const;
