import { createPublicClient, Address, Hex, http, Chain, getContract } from "viem";
import { base } from "viem/chains";
import { privateKeyToAccount } from "viem/accounts";
import { spendPermissionManagerAbi, spendPermissionManagerAddress } from "./abi/SpendPermissionManager";
import { ethers } from 'ethers';

import { V4_CONTRACTS, BASE_TOKENS } from '@/lib/uniswap/v4Constants';


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
  UNISWAP_BASE_MAINNET_QUOTER: "0x0d5e0F971ED27FBfF6c2837bf31316121532048D" as Address,

  V4_POOL_MANAGER: V4_CONTRACTS.POOL_MANAGER,
  V4_POSITION_DESCRIPTOR: V4_CONTRACTS.POSITION_DESCRIPTOR,
  V4_POSITION_MANAGER: V4_CONTRACTS.POSITION_MANAGER,
  V4_QUOTER: V4_CONTRACTS.QUOTER,
  V4_STATE_VIEW: V4_CONTRACTS.STATE_VIEW,
  V4_UNIVERSAL_ROUTER: V4_CONTRACTS.UNIVERSAL_ROUTER,
  V4_PERMIT2: V4_CONTRACTS.PERMIT2,

  WETH: BASE_TOKENS.WETH,
  USDC: BASE_TOKENS.USDC,
  USDT: BASE_TOKENS.USDT,
  DAI: BASE_TOKENS.DAI,

  // Common token addresses
  ETH: "0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE" as Address, // ETH address stays the same
} as const;

export async function validateV4Deployment(
  provider: ethers.providers.Provider
): Promise<{
  isValid: boolean;
  errors: string[];
  deployedContracts: string[];
}> {
  const errors: string[] = [];
  const deployedContracts: string[] = [];
  
  for (const [name, address] of Object.entries(V4_CONTRACTS)) {
    try {
      const code = await provider.getCode(address);
      if (code !== '0x' && code !== '0x0') {
        deployedContracts.push(name);
        console.log(`✅ ${name} validated at ${address}`);
      } else {
        errors.push(`❌ ${name} not deployed at ${address}`);
      }
    } catch (error) {
      errors.push(`❌ Failed to validate ${name}: ${error}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors,
    deployedContracts
  };
}

// Import ABIs
import yieldModuleAbi from "@/abi/savings/YieldModule.json";
import dcaAbi from "@/abi/trading/DCA.json";
import savingAbi from "@/abi/savings/Savings.json";
import savingStrategyAbi from "@/abi/savings/SavingStrategy.json";
import dailySavingsAbi from "@/abi/savings/DailySavings.json";
import spendSaveStorageAbi from "@/abi/core/SpendSaveStorage.json";
import spendSaveHookAbi from "@/abi/core/SpendSaveHook.json";
import tokenAbi from "@/abi/tokens/Token.json";
import poolManagerAbi from "@/abi/core/PoolManager.json";


export async function validateHookPermissions(
  hookAddress: Address,
  provider?: ethers.providers.Provider
): Promise<{ isValid: boolean; errors: string[]; details?: any }> {
  const errors: string[] = [];
  const details: any = {}; 

  try {
    // Use provided provider or create a new one
    const ethersProvider = provider || new ethers.providers.JsonRpcProvider('https://mainnet.base.org');

    // Check if contract exists at the address
    const code = await ethersProvider.getCode(hookAddress);
    if (!code || code === '0x' || code === '0x0') {
      errors.push(`No contract deployed at hook address: ${hookAddress}`);
      return { isValid: false, errors };
    }

    // Create contract instance using ethers.js
    const hookContract = new ethers.Contract(
      hookAddress,
      spendSaveHookAbi,
      ethersProvider
    );

    // Get the hook permissions with proper error handling
    let permissions: any;
    try {
      permissions = await hookContract.getHookPermissions();
      details.permissions = permissions;
      console.log('🔍 Retrieved hook permissions:', permissions);
      
      console.log('📋 Permissions structure:', {
        type: typeof permissions,
        keys: Object.keys(permissions),
        values: Object.values(permissions)
      });
      
    } catch (error) {
      errors.push(`Failed to get hook permissions: ${error instanceof Error ? error.message : String(error)}`);
      return { isValid: false, errors, details };
    }
    
    // Expected permissions for SpendSave hook
    const expectedPermissions = {
      beforeSwap: true,
      afterSwap: true,
      beforeSwapReturnDelta: true,
      afterSwapReturnDelta: true,
    };

    // Validate permissions with multiple access patterns
    let hasPermissionErrors = false;
    
    for (const [key, expected] of Object.entries(expectedPermissions)) {
      let actual: boolean = false; // Initialize with default value
      
      // Try different ways to access the permission value
      if (typeof permissions === 'object' && permissions !== null) {
        // Method 1: Direct property access
        actual = permissions[key] ?? false;
        
        // Method 2: If permissions is array-like (struct returned as array)
        if (!actual && Array.isArray(permissions)) {
          const permissionIndex = getPermissionIndex(key);
          if (permissionIndex >= 0 && permissionIndex < permissions.length) {
            actual = permissions[permissionIndex] ?? false;
          }
        }
        
        // Method 3: If permissions has nested structure
        if (!actual && permissions.permissions) {
          actual = permissions.permissions[key] ?? false;
        }
      }
      
      // Validate the permission
      if (actual !== expected) {
        errors.push(
          `Hook permission mismatch: ${key} expected ${expected}, got ${actual} (type: ${typeof actual})`
        );
        hasPermissionErrors = true;
        console.error(`❌ Permission ${key}: expected ${expected}, got ${actual}`);
      } else {
        console.log(`✅ Permission ${key}: ${actual} (correct)`);
      }
    }

    // Store validation details
    details.expectedPermissions = expectedPermissions;
    details.hasPermissionErrors = hasPermissionErrors;
    details.validationMethod = 'struct-based-validation';

    // ✅ FIX: Additional validation - check hook address flags
    try {
      const hookFlags = getHookFlagsFromAddress(hookAddress);
      details.addressFlags = hookFlags;
      
      // Validate that address flags match expected permissions
      const addressBasedValidation = validateAddressFlags(hookFlags, expectedPermissions);
      if (!addressBasedValidation.isValid) {
        console.warn('⚠️ Address-based hook flags do not match expected permissions:', addressBasedValidation.errors);
        details.addressFlagWarnings = addressBasedValidation.errors;
      }
    } catch (flagError) {
      console.warn('⚠️ Could not validate hook address flags:', flagError);
    }

    // Additional validation: check if modules are initialized
    try {
      await hookContract.checkModulesInitialized();
      console.log('✅ Hook modules are properly initialized');
      details.modulesInitialized = true;
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      if (errorMsg.includes('function does not exist') || errorMsg.includes('not a function')) {
        console.warn('⚠️ checkModulesInitialized method not available (this may be expected)');
        details.modulesInitialized = 'unknown';
      } else {
        console.warn('⚠️ Hook modules may not be properly initialized:', errorMsg);
        details.modulesInitialized = false;
        // Don't treat this as a critical error for now
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

function validateAddressFlags(
  addressFlags: Record<string, boolean>, 
  expectedPermissions: Record<string, boolean>
): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const [key, expected] of Object.entries(expectedPermissions)) {
    const actual = addressFlags[key];
    if (actual !== expected) {
      errors.push(`Address flag ${key}: expected ${expected}, got ${actual}`);
    }
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

function getHookFlagsFromAddress(hookAddress: Address): {
  beforeSwap: boolean;
  afterSwap: boolean;
  beforeSwapReturnDelta: boolean;
  afterSwapReturnDelta: boolean;
  [key: string]: boolean;
} {
  // Extract the last 14 bits from the address
  const addressBigInt = BigInt(hookAddress);
  const mask = BigInt((1 << 14) - 1); // Create 14-bit mask
  const flags = Number(addressBigInt & mask);
  
  return {
    beforeInitialize: Boolean(flags & (1 << 13)),
    afterInitialize: Boolean(flags & (1 << 12)),
    beforeAddLiquidity: Boolean(flags & (1 << 11)),
    afterAddLiquidity: Boolean(flags & (1 << 10)),
    beforeRemoveLiquidity: Boolean(flags & (1 << 9)),
    afterRemoveLiquidity: Boolean(flags & (1 << 8)),
    beforeSwap: Boolean(flags & (1 << 7)),
    afterSwap: Boolean(flags & (1 << 6)),
    beforeDonate: Boolean(flags & (1 << 5)),
    afterDonate: Boolean(flags & (1 << 4)),
    beforeSwapReturnDelta: Boolean(flags & (1 << 3)),
    afterSwapReturnDelta: Boolean(flags & (1 << 2)),
    afterAddLiquidityReturnDelta: Boolean(flags & (1 << 1)),
    afterRemoveLiquidityReturnDelta: Boolean(flags & (1 << 0)),
  };
}

function getPermissionIndex(permissionName: string): number {
  // Based on the Hooks.Permissions struct from Uniswap V4
  const permissionOrder = [
    'beforeInitialize',      // 0
    'afterInitialize',       // 1
    'beforeAddLiquidity',    // 2
    'afterAddLiquidity',     // 3
    'beforeRemoveLiquidity', // 4
    'afterRemoveLiquidity',  // 5
    'beforeSwap',           // 6
    'afterSwap',            // 7
    'beforeDonate',         // 8
    'afterDonate',          // 9
    'beforeSwapReturnDelta', // 10
    'afterSwapReturnDelta',  // 11
    'afterAddLiquidityReturnDelta',    // 12
    'afterRemoveLiquidityReturnDelta', // 13
  ];
  
  return permissionOrder.indexOf(permissionName);
}

function getTickSpacingForFee(fee: number): number {
  switch (fee) {
    case 100: return 1;     // 0.01%
    case 500: return 10;    // 0.05%  
    case 3000: return 60;   // 0.3%
    case 10000: return 200; // 1%
    default: return 60;     // Default to 0.3% spacing
  }
}

export function createPoolKey(
  tokenA: Address,
  tokenB: Address,
  fee: number = 3000
): {
  currency0: Address;
  currency1: Address;
  fee: number;
  tickSpacing: number;
  hooks: Address;
} {
  // Validate fee tier
  if (!isValidFeeTier(fee)) {
    console.warn(`Invalid fee tier ${fee}, using default 3000 (0.3%)`);
    fee = 3000;
  }

  // Ensure tokens are in correct order (lexicographic)
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  return {
    currency0: token0,
    currency1: token1,
    fee: fee,
    tickSpacing: getTickSpacingForFee(fee),
    hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
  };
}

function isValidFeeTier(fee: number): boolean {
  const validFees = [100, 500, 3000, 10000];
  return validFees.includes(fee);
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
      modulesInitialized: validation.details?.modulesInitialized,
      validationMethod: validation.details?.validationMethod
    });
    return { isValid: true, details: validation.details };
  } else {
    console.error('❌ Hook permissions validation failed:');
    validation.errors.forEach(error => console.error(`  - ${error}`));
    
    if (validation.details?.permissions) {
      console.error('📋 Actual permissions found:', validation.details.permissions);
      console.error('🔍 Permission structure analysis:', {
        type: typeof validation.details.permissions,
        keys: Object.keys(validation.details.permissions || {}),
        isArray: Array.isArray(validation.details.permissions)
      });
    }
    
    if (validation.details?.addressFlags) {
      console.log('🏠 Address-based flags:', validation.details.addressFlags);
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

export const SAVINGS_STRATEGY_CONFIG = {
  CONTRACT_ADDRESS: CONTRACT_ADDRESSES.SAVING_STRATEGY, //  SavingStrategy module
  FUNCTION_NAME: 'setSavingStrategy' as const,           //  Public interface
  READ_FUNCTION_NAME: 'getUserSavingStrategy' as const   //  Read from storage
} as const;

// Keep reading from SpendSaveStorage (where data is stored)
export const SAVINGS_STORAGE_CONFIG = {
  CONTRACT_ADDRESS: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
  READ_FUNCTION_NAME: 'getUserSavingStrategy' as const
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

export const STRATEGY_VALIDATION = {
  MIN_PERCENTAGE: 1,    // 1%
  MAX_PERCENTAGE: 50,   // 50%
  MIN_BASIS_POINTS: 100,    // 1% in basis points
  MAX_BASIS_POINTS: 5000,   // 50% in basis points
  DEFAULT_PERCENTAGE: 10,   // 10%
  DEFAULT_MAX_PERCENTAGE: 25, // 25%
} as const;

export const SAVINGS_TOKEN_TYPE = {
  OUTPUT: 0,
  INPUT: 1, 
  SPECIFIC: 2
} as const;

export type SavingsTokenType = typeof SAVINGS_TOKEN_TYPE[keyof typeof SAVINGS_TOKEN_TYPE];

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