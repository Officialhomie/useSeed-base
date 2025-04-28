import { Address } from 'viem';

// Base Sepolia testnet address
export const spendPermissionManagerAddress: Address = '0x9aBda40a6304B9B20fEB3474A4e5e9e6773cd86e';

export const spendPermissionManagerAbi = [
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint160",
            "name": "allowance",
            "type": "uint160"
          },
          {
            "internalType": "uint48",
            "name": "period",
            "type": "uint48"
          },
          {
            "internalType": "uint48",
            "name": "start",
            "type": "uint48"
          },
          {
            "internalType": "uint48",
            "name": "end",
            "type": "uint48"
          },
          {
            "internalType": "uint256",
            "name": "salt",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "extraData",
            "type": "bytes"
          }
        ],
        "internalType": "struct ISpendPermissionManagerTypes.SpendPermission",
        "name": "spendPermission",
        "type": "tuple"
      },
      {
        "internalType": "bytes",
        "name": "signature",
        "type": "bytes"
      }
    ],
    "name": "approveWithSignature",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint160",
            "name": "allowance",
            "type": "uint160"
          },
          {
            "internalType": "uint48",
            "name": "period",
            "type": "uint48"
          },
          {
            "internalType": "uint48",
            "name": "start",
            "type": "uint48"
          },
          {
            "internalType": "uint48",
            "name": "end",
            "type": "uint48"
          },
          {
            "internalType": "uint256",
            "name": "salt",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "extraData",
            "type": "bytes"
          }
        ],
        "internalType": "struct ISpendPermissionManagerTypes.SpendPermission",
        "name": "spendPermission",
        "type": "tuple"
      },
      {
        "internalType": "uint160",
        "name": "amount",
        "type": "uint160"
      },
      {
        "internalType": "address",
        "name": "recipient",
        "type": "address"
      }
    ],
    "name": "spend",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      {
        "components": [
          {
            "internalType": "address",
            "name": "account",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "spender",
            "type": "address"
          },
          {
            "internalType": "address",
            "name": "token",
            "type": "address"
          },
          {
            "internalType": "uint160",
            "name": "allowance",
            "type": "uint160"
          },
          {
            "internalType": "uint48",
            "name": "period",
            "type": "uint48"
          },
          {
            "internalType": "uint48",
            "name": "start",
            "type": "uint48"
          },
          {
            "internalType": "uint48",
            "name": "end",
            "type": "uint48"
          },
          {
            "internalType": "uint256",
            "name": "salt",
            "type": "uint256"
          },
          {
            "internalType": "bytes",
            "name": "extraData",
            "type": "bytes"
          }
        ],
        "internalType": "struct ISpendPermissionManagerTypes.SpendPermission",
        "name": "spendPermission",
        "type": "tuple"
      }
    ],
    "name": "revoke",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  }
] as const; 