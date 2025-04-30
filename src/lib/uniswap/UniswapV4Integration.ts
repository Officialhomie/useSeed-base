import { Address, encodeAbiParameters, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';

interface SwapWithSavingsParams {
  tokenIn: Address;
  tokenOut: Address;
  recipient: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96?: bigint;
}

// Encode hook data for Uniswap V4 swap with SpendSave hook
export function encodeSpendSaveHookData(userAddress: Address): string {
  return encodeAbiParameters(
    [{ type: 'address' }],
    [userAddress]
  );
}

// Prepare swap parameters for Uniswap V4 Router
export function prepareSwapWithSavingsParams(
  params: SwapWithSavingsParams,
  userAddress: Address
): any {
  return {
    ...params,
    sqrtPriceLimitX96: params.sqrtPriceLimitX96 || BigInt(0),
    hookData: encodeSpendSaveHookData(userAddress)
  };
}

// Calculate gas limit for swap with savings operation
export function calculateSwapWithSavingsGasLimit(
  savingsTokenType: number,
  enableDCA: boolean
): bigint {
  let baseGas = BigInt(300000); // Base gas for swap
  
  // Add for savings processing
  if (savingsTokenType === 0) { // INPUT savings
    baseGas = baseGas + BigInt(80000);
  } else if (savingsTokenType === 1) { // OUTPUT savings
    baseGas = baseGas + BigInt(120000);
  } else if (savingsTokenType === 2) { // SPECIFIC token
    baseGas = baseGas + BigInt(200000); // Higher gas for specific token (potential extra swap)
  }
  
  // Add for DCA if enabled
  if (enableDCA) {
    baseGas = baseGas + BigInt(150000);
  }
  
  return baseGas;
}

// Uniswap V4 Pool Manager and Router addresses
export const UNISWAP_V4_ADDRESSES = {
  POOL_MANAGER: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_POOL_MANAGER,
  UNIVERSAL_ROUTER: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
};

// Create a pool key for Uniswap V4
export function createPoolKey(
  tokenA: Address,
  tokenB: Address,
  fee: number = 3000 // Default fee of 0.3%
): any {
  return {
    currency0: tokenA < tokenB ? tokenA : tokenB,
    currency1: tokenA < tokenB ? tokenB : tokenA,
    fee: fee,
    tickSpacing: 60, // Default tick spacing for 0.3% pools
    hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
  };
} 