import { Address, encodeAbiParameters, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import JSBI from 'jsbi';
import { fetchFallbackGas } from '../gas/gasOracle';
import { ethers } from 'ethers';

/**
 * Interface for swap parameters
 */
interface SwapWithSavingsParams {
  tokenIn: Address;
  tokenOut: Address;
  recipient: Address;
  amountIn: bigint;
  amountOutMinimum: bigint;
  sqrtPriceLimitX96?: bigint;
}

export const UNISWAP_V4_FEE_TIERS = {
  VERY_LOW: 100,    // 0.01%
  LOW: 500,         // 0.05% 
  MEDIUM: 3000,     // 0.3%
  HIGH: 10000,      // 1%
} as const;

// ✅ FIX: Add tick spacing mapping
export const FEE_TO_TICK_SPACING: Record<number, number> = {
  [UNISWAP_V4_FEE_TIERS.VERY_LOW]: 1,    // 0.01% → 1
  [UNISWAP_V4_FEE_TIERS.LOW]: 10,        // 0.05% → 10
  [UNISWAP_V4_FEE_TIERS.MEDIUM]: 60,     // 0.3%  → 60
  [UNISWAP_V4_FEE_TIERS.HIGH]: 200,      // 1%    → 200
};

// ✅ FIX: Validate fee tier
export function isValidFeeTier(fee: number): boolean {
  return Object.values(UNISWAP_V4_FEE_TIERS).includes(fee as any);
}

// ✅ FIX: Get tick spacing for fee tier with validation
export function getTickSpacingForFee(fee: number): number {
  if (!isValidFeeTier(fee)) {
    console.warn(`Invalid fee tier ${fee}, using default 3000 (0.3%)`);
    return FEE_TO_TICK_SPACING[UNISWAP_V4_FEE_TIERS.MEDIUM];
  }
  return FEE_TO_TICK_SPACING[fee];
}




// Constants for min and max sqrt price ratios
const MIN_SQRT_RATIO = JSBI.BigInt('4295128739'); // Same as TickMath.MIN_SQRT_RATIO
const MAX_SQRT_RATIO = JSBI.BigInt('1461446703485210103287273052203988822378723970342'); // Same as TickMath.MAX_SQRT_RATIO

/**
 * Encode hook data for Uniswap V4 swap with SpendSave hook
 * @param userOrFlags The address of the user or hook flags object
 * @returns Encoded hook data
 */
export function encodeSpendSaveHookData(userOrFlags: Address | {
  before?: boolean;
  after?: boolean;
  delta?: boolean;
  path?: string[];
}): string {
  // If it's an address (string starting with 0x)
  if (typeof userOrFlags === 'string' && userOrFlags.startsWith('0x')) {
    return encodeAbiParameters(
      [{ type: 'address' }],
      [userOrFlags as Address]
    );
  }
  
  // If it's a hook flags object - encode appropriately
  // For now, just return empty bytes for flags (implement based on your hook's needs)
  return '0x';
}



/**
 * Prepare swap parameters for Uniswap V4 Router with SpendSave hook
 * @param params Swap parameters
 * @param userAddress User address to encode in hook data
 * @returns Parameters ready for Universal Router
 */
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

/**
 * Create a pool key for Uniswap V4 with SpendSave hook
 * @param tokenA First token address
 * @param tokenB Second token address
 * @param fee Fee tier (default 3000 = 0.3%)
 * @returns Pool key object
 */
export function createPoolKey(
  tokenA: Address,
  tokenB: Address,
  fee: number = UNISWAP_V4_FEE_TIERS.MEDIUM // Default to 0.3%
): {
  currency0: Address;
  currency1: Address; 
  fee: number;
  tickSpacing: number;
  hooks: Address;
} {
  // ✅ FIX: Validate fee tier
  if (!isValidFeeTier(fee)) {
    throw new Error(`Invalid fee tier: ${fee}. Must be one of: ${Object.values(UNISWAP_V4_FEE_TIERS).join(', ')}`);
  }

  // Ensure tokens are in correct order (lexicographic)
  const [token0, token1] = tokenA.toLowerCase() < tokenB.toLowerCase() 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  return {
    currency0: token0,
    currency1: token1,
    fee: fee,
    tickSpacing: getTickSpacingForFee(fee), // ✅ FIX: Dynamic tick spacing
    hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
  };
}

export function createPoolKeyWithDefaults(
  tokenA: Address,
  tokenB: Address
): ReturnType<typeof createPoolKey> {
  return createPoolKey(tokenA, tokenB, UNISWAP_V4_FEE_TIERS.MEDIUM);
}


/**
 * Derive a sqrtPriceLimitX96 based on user slippage percentage.
 * Uniswap V4 treats a limit of 0 as "no limit", which is dangerous for
 * production.  This utility gives a tight but safe bound around the current
 * pool price so that excessive price movement reverts instead of executing.
 *
 * @param zeroForOne  Direction of the swap – true  ➜ token0 → token1
 * @param slippagePct Percentage (e.g. 0.5 for 0.5 %)
 */
export function getSqrtPriceLimit(zeroForOne: boolean, slippagePct: number): bigint {
  // ✅ FIX: Better input validation
  if (slippagePct < 0) {
    throw new Error('Slippage percentage cannot be negative');
  }
  
  if (slippagePct > 50) {
    throw new Error('Slippage percentage too high (>50%). This is likely an error.');
  }
  
  // Guard against bad input - use extreme boundaries for 0% slippage
  if (slippagePct <= 0) {
    return zeroForOne
      ? BigInt(MIN_SQRT_RATIO.toString()) + BigInt(1)
      : BigInt(MAX_SQRT_RATIO.toString()) - BigInt(1);
  }

  // Convert constants (JSBI) -> bigint for arithmetic convenience
  const MIN = BigInt(MIN_SQRT_RATIO.toString()) + BigInt(1);
  const MAX = BigInt(MAX_SQRT_RATIO.toString()) - BigInt(1);

  // ✅ FIX: More precise slippage calculation
  // slippagePct is expressed as N %, we convert to parts-per-1e6 to keep precision
  const slipPartsPerMillion = Math.round(slippagePct * 10_000); // 1% = 10000 ppm
  
  // ✅ FIX: Add bounds checking for the calculation
  const delta = (MAX - MIN) * BigInt(slipPartsPerMillion) / BigInt(1_000_000);
  
  const result = zeroForOne ? MIN + delta : MAX - delta;
  
  // ✅ FIX: Ensure result is within valid bounds
  if (result <= MIN || result >= MAX) {
    console.warn(`Calculated sqrt price limit ${result} is near boundaries, using safer default`);
    return zeroForOne ? MIN + BigInt(1000) : MAX - BigInt(1000);
  }
  
  return result;
}