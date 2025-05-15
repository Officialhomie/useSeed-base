import { Address, encodeAbiParameters, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import JSBI from 'jsbi';

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

/**
 * Complexity multipliers for different operation types
 */
export const OPERATION_COMPLEXITY = {
  BASE_SWAP: 1.0,           // Basic swap operation
  INPUT_SAVINGS: 1.3,       // Saving from input token
  OUTPUT_SAVINGS: 1.4,       // Saving from output token
  SPECIFIC_TOKEN: 1.7,       // Saving to specific token (requires swaps)
  DCA_ENABLED: 1.5,          // DCA functionality enabled
};

/**
 * Gas estimates for different transaction sizes in ETH
 */
export const TRANSACTION_SIZE_GAS = {
  MICRO: {                   // < 0.001 ETH
    multiplier: 1.5,
    baseSwap: BigInt(400000),
    withSavings: BigInt(600000),
    withDca: BigInt(800000),
  },
  SMALL: {                   // 0.001 - 0.01 ETH
    multiplier: 1.3,
    baseSwap: BigInt(350000),
    withSavings: BigInt(500000),
    withDca: BigInt(650000),
  },
  MEDIUM: {                  // 0.01 - 0.1 ETH
    multiplier: 1.1,
    baseSwap: BigInt(300000),
    withSavings: BigInt(450000),
    withDca: BigInt(600000),
  },
  LARGE: {                   // > 0.1 ETH
    multiplier: 1.0,
    baseSwap: BigInt(250000),
    withSavings: BigInt(400000),
    withDca: BigInt(550000),
  },
};

// Constants for min and max sqrt price ratios
const MIN_SQRT_RATIO = JSBI.BigInt('4295128739'); // Same as TickMath.MIN_SQRT_RATIO
const MAX_SQRT_RATIO = JSBI.BigInt('1461446703485210103287273052203988822378723970342'); // Same as TickMath.MAX_SQRT_RATIO

/**
 * Encode hook data for Uniswap V4 swap with SpendSave hook
 * @param userAddress The address of the user performing the swap
 * @returns Encoded hook data
 */
export function encodeSpendSaveHookData(userAddress: Address): string {
  return encodeAbiParameters(
    [{ type: 'address' }],
    [userAddress]
  );
}

/**
 * Get transaction size category based on ETH amount
 * @param ethAmount Amount in ETH
 * @returns Transaction size category
 */
export function getTransactionSizeCategory(ethAmount: number): 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE' {
  if (ethAmount < 0.001) return 'MICRO';
  if (ethAmount < 0.01) return 'SMALL';
  if (ethAmount < 0.1) return 'MEDIUM';
  return 'LARGE';
}

/**
 * Calculate gas limit for a Uniswap V4 swap with SpendSave hook
 * @param params Parameters for gas calculation
 * @returns Gas limit and information about fallback usage
 */
export function calculateV4SwapGasLimit(params: {
  fromToken: string;
  toToken: string;
  value: bigint | number;
  savingsTokenType: number; 
  enableDCA: boolean;
  disableSavings: boolean;
}): { gasLimit: bigint; usingFallback: boolean; sizeCategory: string } {
  const { fromToken, toToken, value, savingsTokenType, enableDCA, disableSavings } = params;
  
  // Get transaction size category
  let ethAmount = 0;
  
  if (typeof value === 'bigint') {
    ethAmount = Number(value) / 1e18;
  } else {
    ethAmount = value;
  }
  
  const sizeCategory = getTransactionSizeCategory(ethAmount);
  const sizeTier = TRANSACTION_SIZE_GAS[sizeCategory];
  
  // Determine base gas based on transaction characteristics
  let baseGas: bigint;
  
  if (disableSavings) {
    // Just a basic swap
    baseGas = sizeTier.baseSwap;
  } else {
    // With savings features
    if (enableDCA) {
      baseGas = sizeTier.withDca;
    } else {
      baseGas = sizeTier.withSavings;
    }
    
    // Apply savings type multiplier
    let typeFactor = 1.0;
    if (savingsTokenType === 0) { // INPUT
      typeFactor = OPERATION_COMPLEXITY.INPUT_SAVINGS;
    } else if (savingsTokenType === 1) { // OUTPUT
      typeFactor = OPERATION_COMPLEXITY.OUTPUT_SAVINGS;
    } else if (savingsTokenType === 2) { // SPECIFIC
      typeFactor = OPERATION_COMPLEXITY.SPECIFIC_TOKEN;
    }
    
    baseGas = BigInt(Math.ceil(Number(baseGas) * typeFactor));
  }
  
  // Apply size category multiplier
  baseGas = BigInt(Math.ceil(Number(baseGas) * sizeTier.multiplier));
  
  return {
    gasLimit: baseGas,
    usingFallback: true, // Always using calculated values for reliability
    sizeCategory: sizeCategory
  };
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
 * Calculate buffer for ETH transactions to ensure enough is left for gas
 * @param ethBalance User's ETH balance
 * @param txSize Transaction size category
 * @returns Recommended buffer in ETH
 */
export function calculateEthBuffer(
  ethBalance: number,
  txSize: 'MICRO' | 'SMALL' | 'MEDIUM' | 'LARGE'
): number {
  const DEFAULT_GAS_PRICE = 30; // gwei
  
  // Gas limits from transaction size tiers
  const gasLimit = Number(TRANSACTION_SIZE_GAS[txSize].withDca);
  
  // Calculate estimated gas cost in ETH
  // gas_limit * gas_price(gwei) * 10^-9
  const estimatedGasCost = gasLimit * DEFAULT_GAS_PRICE * 1e-9;
  
  // Add 20% safety margin
  const withSafetyMargin = estimatedGasCost * 1.2;
  
  // Cap at percentage of balance for very small balances
  const maxBuffer = ethBalance * 0.2; // Max 20% of balance
  
  return Math.min(withSafetyMargin, maxBuffer);
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