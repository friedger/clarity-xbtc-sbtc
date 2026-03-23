export const abiSwappingXbtc = {
  "functions": [
    {
      "name": "is-swap-contract-calling",
      "access": "private",
      "args": [],
      "outputs": {
        "type": "bool"
      }
    },
    {
      "name": "burn",
      "access": "public",
      "args": [
        {
          "name": "amount",
          "type": "uint128"
        },
        {
          "name": "user",
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
      "name": "mint",
      "access": "public",
      "args": [
        {
          "name": "amount",
          "type": "uint128"
        },
        {
          "name": "user",
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
      "name": "set-swap-contract",
      "access": "public",
      "args": [
        {
          "name": "ctr",
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
      "name": "transfer",
      "access": "public",
      "args": [
        {
          "name": "amount",
          "type": "uint128"
        },
        {
          "name": "sender",
          "type": "principal"
        },
        {
          "name": "recipient",
          "type": "principal"
        },
        {
          "name": "memo",
          "type": {
            "optional": {
              "buffer": {
                "length": 34
              }
            }
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
      "name": "get-balance",
      "access": "read_only",
      "args": [
        {
          "name": "who",
          "type": "principal"
        }
      ],
      "outputs": {
        "type": {
          "response": {
            "ok": "uint128",
            "error": "none"
          }
        }
      }
    },
    {
      "name": "get-decimals",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": "uint128",
            "error": "none"
          }
        }
      }
    },
    {
      "name": "get-name",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "string-ascii": {
                "length": 24
              }
            },
            "error": "none"
          }
        }
      }
    },
    {
      "name": "get-symbol",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "string-ascii": {
                "length": 6
              }
            },
            "error": "none"
          }
        }
      }
    },
    {
      "name": "get-token-uri",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": {
              "optional": "none"
            },
            "error": "none"
          }
        }
      }
    },
    {
      "name": "get-total-supply",
      "access": "read_only",
      "args": [],
      "outputs": {
        "type": {
          "response": {
            "ok": "uint128",
            "error": "none"
          }
        }
      }
    }
  ],
  "variables": [
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
      "name": "swap-contract",
      "type": {
        "optional": "principal"
      },
      "access": "variable"
    }
  ],
  "maps": [],
  "fungible_tokens": [
    {
      "name": "swapping-xbtc"
    }
  ],
  "non_fungible_tokens": [],
  "epoch": "Epoch33",
  "clarity_version": "Clarity4"
} as const;
