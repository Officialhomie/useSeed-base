import { createPublicClient, Address, Hex, http, Chain, getContract } from "viem";
import { baseSepolia } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { spendPermissionManagerAbi, spendPermissionManagerAddress } from "./abi/SpendPermissionManager";

// Contract addresses
export const CONTRACT_ADDRESSES = {
  SPEND_PERMISSION_MANAGER: spendPermissionManagerAddress as Address,
  YIELD_MODULE: "0x8f6525f62BD55B6B9Bb77F2344F2919D60c33fa9" as Address,
  DCA: "0x5142ffbFEC05CEA2b59d13d4502bfCb45403A519" as Address,
  SAVING: "0x0bb069A405ACAd5050eC67C86F552eBd8D8a1825" as Address,
  DAILY_SAVINGS: "0xf8309bd20df4Ce54029e546ec4a6316f204a3c5f" as Address,
  SPEND_SAVE_STORAGE: "0xF45FA81280373EFc5B2843386478733589e421Aa" as Address,
  SPEND_SAVE_HOOK: "0xB9D7c1F9374379E4BAaFb8C69262cf75213A80cC" as Address,
  SAVING_STRATEGY: "0x27C7fe9067eF54212CC3FcEA6A9A042fDAb22e08" as Address,
  TREASURY: "0x9aC2d5a0A0E88D459Ecfb68Bcbb94DFD7cdF1f09" as Address,
  SLIPPAGE_CONTROL: "0x257DEBe1424EE59624dF003231082fb140338Fa5" as Address,
  TOKEN: "0x08CBAF1e6b949AaE6407AbF845D13533cde62EF0" as Address,

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