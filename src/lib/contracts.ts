import { createPublicClient, Address, Hex, http, Chain, getContract } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { spendPermissionManagerAbi, spendPermissionManagerAddress } from "./abi/SpendPermissionManager";

// Contract addresses
export const CONTRACT_ADDRESSES = {
  SPEND_PERMISSION_MANAGER: spendPermissionManagerAddress as Address,
  YIELD_MODULE: "0x7490C06A3aa9f67cF0A3C60c16d8C1c9cDb4d80A" as Address,
  DCA: "0xaa6e63E70C8c267145953c505E166193DC775e9e" as Address,
  SAVING: "0x80B797A3a3d75f2bbeEA0ba4672c1de2D95B9c07" as Address,
  DAILY_SAVINGS: "0x134f9eF6441eF08d10545106ca9c5058e4AED695" as Address,
  SPEND_SAVE_STORAGE: "0x130Acdd4d63dDaBc3c834e059Fcb6467E9bAb88b" as Address,
  SPEND_SAVE_HOOK: "0x11b946B9852c52d2DBAEc4de0Bd4cAA1438880cC" as Address,
  SAVING_STRATEGY: "0x4f477a464aBE8d6Faf2F94F55AEab5B7be6A1D1a" as Address,
  TREASURY: "0x9aC2d5a0A0E88D459Ecfb68Bcbb94DFD7cdF1f09" as Address,
  SLIPPAGE_CONTROL: "0x7ddc43c892f7662748426F3f9865495AA3364bC5" as Address,
  TOKEN: "0x5E35aE4Ae9D32a9742022E4e38f69A140a9a339f" as Address,

  UNISWAP_BASE_SEPOLIA_POOL_MANAGER: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" as Address,
  UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER: "0x492e6456d9528771018deb9e87ef7750ef184104" as Address,
  // Common token addresses
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address,
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address, // Base Sepolia USDC
  WETH: "0x4200000000000000000000000000000000000006" as Address, // Base Sepolia WETH
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as Address, // Base Sepolia DAI
} as const;

// Import ABIs
import yieldModuleAbi from "../ABI/YieldModule.json";
import dcaAbi from "../ABI/DCA.json";
import savingAbi from "../ABI/Saving.json";
import dailySavingsAbi from "../ABI/DailySavings.json";
import spendSaveStorageAbi from "../ABI/SpenSaveStorage.json";
import spendSaveHookAbi from "../ABI/SpendSaveHook.json";
import tokenAbi from "../ABI/Token.json";

// Initialize public client
export const getPublicClient = (chain: Chain = baseSepolia) => {
  return createPublicClient({
    chain,
    transport: http(),
  });
};

// Contract instances creation helper
export const getContractInstance = (
  address: Address,
  abi: any,
  chain: Chain = baseSepolia
) => {
  const publicClient = getPublicClient(chain);
  return getContract({
    address,
    abi,
    client: publicClient,
  });
};

// Get contract instances
export const getContracts = (chain: Chain = baseSepolia) => {
  return {
    spendPermissionManager: getContractInstance(
      CONTRACT_ADDRESSES.SPEND_PERMISSION_MANAGER,
      spendPermissionManagerAbi,
      chain
    ),
    yieldModule: getContractInstance(
      CONTRACT_ADDRESSES.YIELD_MODULE,
      yieldModuleAbi,
      chain
    ),
    dca: getContractInstance(
      CONTRACT_ADDRESSES.DCA,
      dcaAbi,
      chain
    ),
    saving: getContractInstance(
      CONTRACT_ADDRESSES.SAVING,
      savingAbi,
      chain
    ),
    dailySavings: getContractInstance(
      CONTRACT_ADDRESSES.DAILY_SAVINGS,
      dailySavingsAbi,
      chain
    ),
    spendSaveStorage: getContractInstance(
      CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
      spendSaveStorageAbi,
      chain
    ),
    spendSaveHook: getContractInstance(
      CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
      spendSaveHookAbi,
      chain
    ),
  };
};

// Helper for token contract instances
export const getTokenContract = (
  tokenAddress: Address,
  chain: Chain = baseSepolia
) => {
  return getContractInstance(tokenAddress, tokenAbi, chain);
};

// Get spender wallet client (for backend operations)
export async function getSpenderWalletClient(chain: Chain = baseSepolia) {
  const spenderAccount = privateKeyToAccount(
    process.env.SPENDER_PRIVATE_KEY! as Hex
  );

  return {
    account: spenderAccount,
    chain,
  };
} 