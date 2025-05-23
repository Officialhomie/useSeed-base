import { createPublicClient, Address, Hex, http, Chain, getContract } from "viem";
import { base } from "viem/chains";
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

  UNISWAP_BASE_MAINNET_POOL_MANAGER: "0x498581ff718922c3f8e6a244956af099b2652b2b" as Address,
  UNISWAP_BASE_MAINNET_UNIVERSAL_ROUTER: "0x6ff5693b99212da76ad316178a184ab56d299b43" as Address,
  UNISWAP_BASE_MAINNET_POOL_SWAP_TEST: "0x8b5bcc363dde2614281ad875bad385e0a785d3b9" as Address,
  UNISWAP_BASE_MAINNET_V4QUOTER: "0x0d5e0f971ed27fbff6c2837bf31316121532048d" as Address,
  UNISWAP_BASE_MAINNET_STATE_VIEW: "0xa3c0c9b65bad0b08107aa264b0f3db444b867a71" as Address,
  UNISWAP_BASE_MAINNET_POSITIONS_MANAGER: "0x7c5f5a4bbd8fd63184577525326123b519429bdc" as Address,
  UNISWAP_BASE_MAINNET_POSITIONS_DESCRIPTOR: "0x25D093633990DC94BeDEeD76C8F3CDaa75f3E7D5" as Address,
  // Common token addresses
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address, // ETH address stays the same
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, // Base Mainnet USDC
  WETH: "0x4200000000000000000000000000000000000006" as Address, // Base Mainnet WETH (same as Sepolia)
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as Address, // Base Mainnet DAI
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
import PositonDescAbi from "../ABI/PositionDescriptor.json"
import PositionManAbi from "../ABI/PositionManager.json";
import poolManagerAbi from "../ABI/PoolManager.json";
import universalRouterAbi from "../ABI/UniversalRouter.json";
import v4QuoterAbi from "../ABI/V4Quoter.json";
import stateViewAbi from "../ABI/StateView.json";

// Initialize public client
export const getPublicClient = (chain: Chain = base) => {
  return createPublicClient({
    chain,
    transport: http(),
  });
};

// Contract instances creation helper
export const getContractInstance = (
  address: Address,
  abi: any,
  chain: Chain = base
) => {
  const publicClient = getPublicClient(chain);
  return getContract({
    address,
    abi,
    client: publicClient,
  });
};

// Get contract instances
export const getContracts = (chain: Chain = base) => {
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
    token: getContractInstance(
      CONTRACT_ADDRESSES.TOKEN,
      tokenAbi,
      chain
    ),
    uniswapPoolManager: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_MANAGER,
      poolManagerAbi,
      chain
    ),
    uniswapUniversalRouter: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_UNIVERSAL_ROUTER,
      universalRouterAbi,
      chain
    ),
    uniswapPoolSwapTest: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_SWAP_TEST,
      poolSwapTestAbi,
      chain
    ),
    uniswapV4Quoter: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_V4QUOTER,
      v4QuoterAbi,
      chain
    ),
    uniswapStateView: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_STATE_VIEW,
      stateViewAbi,
      chain
    ),
    uniswapPositionsManager: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POSITIONS_MANAGER,
      PositionManAbi,
      chain
    ),
    uniswapPositionsDescriptor: getContractInstance(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POSITIONS_DESCRIPTOR,
      PositonDescAbi,
      chain
    ),
  };
};

// Helper for token contract instances
export const getTokenContract = (
  tokenAddress: Address,
  chain: Chain = base
) => {
  return getContractInstance(tokenAddress, tokenAbi, chain);
};

// Get spender wallet client (for backend operations)
export async function getSpenderWalletClient(chain: Chain = base) {
  const spenderAccount = privateKeyToAccount(
    process.env.SPENDER_PRIVATE_KEY! as Hex
  );

  return {
    account: spenderAccount,
    chain,
  };
} 