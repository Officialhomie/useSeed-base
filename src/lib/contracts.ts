import { createPublicClient, Address, Hex, http, Chain, getContract } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { spendPermissionManagerAbi, spendPermissionManagerAddress } from "./abi/SpendPermissionManager";

// Contract addresses
export const CONTRACT_ADDRESSES = {
  SPEND_PERMISSION_MANAGER: spendPermissionManagerAddress as Address,
  YIELD_MODULE: "0x4f477a464aBE8d6Faf2F94F55AEab5B7be6A1D1a" as Address,
  DCA: "0xfa3b93C87D570d2DF666e63E11E7910Ffe048460" as Address,
  SAVING: "0x99c5F0Cc4Ff80a99CCf39DDce9E0Ea8903251b53" as Address,
  DAILY_SAVINGS: "0x130Acdd4d63dDaBc3c834e059Fcb6467E9bAb88b" as Address,
  SPEND_SAVE_STORAGE: "0xF8F8aCC3B75583B08294c16Cc416f6580B29F77E" as Address,
  SPEND_SAVE_HOOK: "0x60aEE921a96538Ef1A793b7e737eFf6E40f040Cc" as Address,
  SAVING_STRATEGY: "0xCA0FC415938187A20A6B4c21e32D64e7c0a0DA6E" as Address,
  TREASURY: "0x9aC2d5a0A0E88D459Ecfb68Bcbb94DFD7cdF1f09" as Address,
  SLIPPAGE_CONTROL: "0x23432eA9F072f1f279e155e491d9AE046f4D7cC4" as Address,
  TOKEN: "0xDd68A972612900DC5c25f3C643a1d85C9B69b8F4" as Address,

  UNISWAP_BASE_MAINNET_POOL_MANAGER: "0x05E73354cFDd6745C338b50BcFDfA3Aa6fA03408" as Address,
  UNISWAP_BASE_MAINNET_UNIVERSAL_ROUTER: "0x492e6456d9528771018deb9e87ef7750ef184104" as Address,
  UNISWAP_BASE_MAINNET_POOL_SWAP_TEST: "0x8b5bcc363dde2614281ad875bad385e0a785d3b9" as Address,
  UNISWAP_BASE_MAINNET_V4QUOTER: "0x4a6513c898fe1b2d0e78d3b0e0a4a151589b1cba" as Address,
  UNISWAP_BASE_MAINNET_STATE_VIEW: "0x571291b572ed32ce6751a2Cb2486EbEe8DEfB9B4" as Address,
  // Common token addresses
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address,
  USDC: "0x036CbD53842c5426634e7929541eC2318f3dCF7e" as Address, // Base Sepolia USDC
  WETH: "0x4200000000000000000000000000000000000006" as Address, // Base Sepolia WETH
  // DAI: "0x7d90bb8638Eed8d8D7624643927fBc9984750360" as Address, // Base Sepolia DAI - Removed as it doesn't exist on Base Sepolia
} as const;

// Import ABIs
import yieldModuleAbi from "../ABI/YieldModule.json";
import dcaAbi from "../ABI/DCA.json";
import savingAbi from "../ABI/Saving.json";
import savingStrategyAbi from "../ABI/SavingStrategy.json";
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
    savingStrategy: getContractInstance(
      CONTRACT_ADDRESSES.SAVING_STRATEGY,
      savingStrategyAbi,
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