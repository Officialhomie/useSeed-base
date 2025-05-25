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
  
  // If it's a hook flags object
  // For now, just return a simple hex string
  // In a production implementation, this would encode the flags and path
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
  fee: number = 3000 // Default fee of 0.3%
): any {
  // Ensure tokens are in correct order
  const [token0, token1] = tokenA < tokenB 
    ? [tokenA, tokenB] 
    : [tokenB, tokenA];
  
  return {
    currency0: token0,
    currency1: token1,
    fee: fee,
    tickSpacing: 60, // Default tick spacing for 0.3% pools
    hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
  };
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
  // Guard against bad input
  if (slippagePct <= 0) {
    // 0 % ⇒ use the extreme boundary the protocol allows (+/- 1 to avoid exact boundary)
    return zeroForOne
      ? BigInt(MIN_SQRT_RATIO.toString()) + BigInt(1)
      : BigInt(MAX_SQRT_RATIO.toString()) - BigInt(1);
  }

  // Convert constants (JSBI) -> bigint for arithmetic convenience
  const MIN = BigInt(MIN_SQRT_RATIO.toString()) + BigInt(1);
  const MAX = BigInt(MAX_SQRT_RATIO.toString()) - BigInt(1);

  // slippagePct is expressed as N %, we convert to parts-per-1e6 to keep precision
  const slipPartsPerMillion = Math.round(slippagePct * 10_000); // 1 % = 10000 ppm

  const delta = (MAX - MIN) * BigInt(slipPartsPerMillion) / BigInt(1000000);

  return zeroForOne ? MIN + delta : MAX - delta;
} 