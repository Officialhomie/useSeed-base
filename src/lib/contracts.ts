import { createPublicClient, Address, Hex, http, Chain, getContract } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { spendPermissionManagerAbi, spendPermissionManagerAddress } from "./abi/SpendPermissionManager";
import { ethers } from 'ethers';


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
  // Common token addresses
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address, // ETH address stays the same
  USDC: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913" as Address, // Base Mainnet USDC
  WETH: "0x4200000000000000000000000000000000000006" as Address, // Base Mainnet WETH (same as Sepolia)
  DAI: "0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb" as Address, // Base Mainnet DAI
} as const;

// Import ABIs
import yieldModuleAbi from "../abi/savings/YieldModule.json";
import dcaAbi from "../abi/trading/DCA.json";
import savingAbi from "../abi/savings/Savings.json";
import savingStrategyAbi from "../abi/savings/SavingStrategy.json";
import dailySavingsAbi from "../abi/savings/DailySavings.json";
import spendSaveStorageAbi from "../abi/core/SpendSaveStorage.json";
import spendSaveHookAbi from "../abi/core/SpendSaveHook.json";
import tokenAbi from "@/abi/tokens/Token.json";
import poolManagerAbi from "../abi/core/PoolManager.json";

export async function validateHookPermissions(
  hookAddress: Address,
  provider?: ethers.providers.Provider
): Promise<{ isValid: boolean; errors: string[]; details?: any }> {
  const errors: string[] = [];
  let details: any = {};

  try {
    // Use provided provider or create a new one
    const ethersProvider = provider || new ethers.providers.JsonRpcProvider('https://mainnet.base.org');

    // Check if contract exists at the address
    const code = await ethersProvider.getCode(hookAddress);
    if (!code || code === '0x' || code === '0x0') {
      errors.push(`No contract deployed at hook address: ${hookAddress}`);
      return { isValid: false, errors };
    }

    // Create contract instance using ethers.js (consistent with your codebase)
    const hookContract = new ethers.Contract(
      hookAddress,
      spendSaveHookAbi,
      ethersProvider
    );

    // Get the hook permissions
    let permissions: any;
    try {
      permissions = await hookContract.getHookPermissions();
      details.permissions = permissions;
      console.log('🔍 Retrieved hook permissions:', permissions);
    } catch (error) {
      errors.push(`Failed to get hook permissions: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, details };
    }
    
    // Expected permissions for SpendSave hook - MY 4 KEY FLAGS
    const expectedPermissions = {
      beforeSwap: true,                    // SpendSave needs beforeSwap
      afterSwap: true,                     // SpendSave needs afterSwap  
      beforeSwapReturnDelta: true,         // SpendSave needs beforeSwap delta
      afterSwapReturnDelta: true,          // SpendSave needs afterSwap delta
    };

    // Validate the 4 critical permissions
    let hasPermissionErrors = false;
    for (const [key, expected] of Object.entries(expectedPermissions)) {
      const actual = permissions[key];
      if (actual !== expected) {
        errors.push(
          `Hook permission mismatch: ${key} expected ${expected}, got ${actual}`
        );
        hasPermissionErrors = true;
      } else {
        console.log(`✅ Permission ${key}: ${actual} (correct)`);
      }
    }

    // Store validation details
    details.expectedPermissions = expectedPermissions;
    details.hasPermissionErrors = hasPermissionErrors;

    // Additional validation: check if modules are initialized
    try {
      await hookContract.checkModulesInitialized();
      console.log('✅ Hook modules are properly initialized');
      details.modulesInitialized = true;
    } catch (error) {
      // This might not be a critical error if the method doesn't exist
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('function does not exist') || errorMsg.includes('not a function')) {
        console.warn('⚠️ checkModulesInitialized method not available (this may be expected)');
        details.modulesInitialized = 'unknown';
      } else {
        errors.push('Hook modules not properly initialized');
        details.modulesInitialized = false;
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      details
    };

  } catch (error) {
    const errorMsg = `Hook validation failed: ${error instanceof Error ? error.message : String(error)}`;
    errors.push(errorMsg);
    console.error('❌', errorMsg);
    return { isValid: false, errors, details };
  }
}

/**
 * Validate hook address and log results
 */
export async function validateAndLogHook(
  provider?: ethers.providers.Provider
): Promise<{ isValid: boolean; details: any }> {
  console.log('🔍 Validating SpendSave hook permissions...');
  
  const validation = await validateHookPermissions(
    CONTRACT_ADDRESSES.SPEND_SAVE_HOOK, 
    provider
  );
  
  if (validation.isValid) {
    console.log('✅ Hook permissions validation passed');
    console.log('📋 Hook details:', {
      address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
      permissions: validation.details?.expectedPermissions,
      modulesInitialized: validation.details?.modulesInitialized
    });
    return { isValid: true, details: validation.details };
  } else {
    console.error('❌ Hook permissions validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (validation.details?.permissions) {
      console.error('📋 Actual permissions found:', validation.details.permissions);
    }
    
    return { isValid: false, details: validation.details };
  }
}



// Initialize public client
export const getPublicClient = (chain: Chain = base) => {
  return createPublicClient({
    chain,
    transport: http(),
  });
};

// ========== PHASE 3: EXPORT SPECIFIC ADDRESS GROUPS ==========
export const APPROVAL_REQUIRED_CONTRACTS = {
  POOL_MANAGER: CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_MANAGER,
  SPEND_SAVE_HOOK: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
} as const;

export const TOKEN_ADDRESSES = {
  ETH: CONTRACT_ADDRESSES.ETH,
  USDC: CONTRACT_ADDRESSES.USDC, 
  WETH: CONTRACT_ADDRESSES.WETH,
} as const;

export const SAVINGS_CONTRACTS = {
  STORAGE: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
  STRATEGY: CONTRACT_ADDRESSES.SAVING_STRATEGY,
  DCA: CONTRACT_ADDRESSES.DCA,
  HOOK: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
} as const;

// ========== TYPE EXPORTS FOR TYPE SAFETY ==========
export type ContractAddressKey = keyof typeof CONTRACT_ADDRESSES;
export type TokenSymbol = keyof typeof TOKEN_ADDRESSES;

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