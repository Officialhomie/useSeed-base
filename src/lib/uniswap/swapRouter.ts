import { Token, CurrencyAmount, TradeType, Percent, Currency } from '@uniswap/sdk-core'
import { Pool } from '@uniswap/v4-sdk'
import { Address } from 'viem'
import { SUPPORTED_TOKENS, CHAIN_ID, getTokenBySymbol, SupportedTokenSymbol } from './tokens'
import { CONTRACT_ADDRESSES } from '../contracts'
import JSBI from 'jsbi'

// Constants
const POOL_FEE = 3000 // 0.3%
const THIRTY_MINUTES = 1800 // 30 minutes in seconds

// Simplified price oracle with approximate prices
const PRICE_ORACLE = {
  'ETH/USDC': 2500,    // 1 ETH = 2500 USDC
  'ETH/DAI': 2500,     // 1 ETH = 2500 DAI
  'ETH/WETH': 1,       // 1 ETH = 1 WETH
  'WETH/USDC': 2500,   // 1 WETH = 2500 USDC
  'WETH/DAI': 2500,    // 1 WETH = 2500 DAI
  'USDC/DAI': 1,       // 1 USDC = 1 DAI
};

// Types
interface SwapParameters {
  fromToken: SupportedTokenSymbol
  toToken: SupportedTokenSymbol
  amount: bigint
  slippageTolerance: number
  recipient: Address
}

interface SwapRoute {
  quote: CurrencyAmount<Token>
  route: Pool | null
}

// Get price for token pair
function getPrice(fromToken: SupportedTokenSymbol, toToken: SupportedTokenSymbol): number {
  const key = `${fromToken}/${toToken}` as keyof typeof PRICE_ORACLE;
  
  if (PRICE_ORACLE[key]) {
    return PRICE_ORACLE[key];
  }
  
  // Try reverse pair
  const reverseKey = `${toToken}/${fromToken}` as keyof typeof PRICE_ORACLE;
  if (PRICE_ORACLE[reverseKey]) {
    return 1 / PRICE_ORACLE[reverseKey];
  }
  
  // Fall back to default price
  if (fromToken === 'ETH' || fromToken === 'WETH') {
    return 2500;
  } else if (toToken === 'ETH' || toToken === 'WETH') {
    return 1 / 2500;
  }
  
  return 1; // Default 1:1 for unknown pairs
}

// Get quote for swap
export async function getSwapQuote(
  fromToken: SupportedTokenSymbol,
  toToken: SupportedTokenSymbol,
  amount: bigint
): Promise<SwapRoute> {
  try {
    const tokenA = getTokenBySymbol(fromToken);
    const tokenB = getTokenBySymbol(toToken);

    if (!tokenA || !tokenB) {
      throw new Error('Invalid token symbols');
    }

    // Calculate output amount based on simple price oracle
    const price = getPrice(fromToken, toToken);
    const amountIn = Number(amount) / (10 ** tokenA.decimals);
    const amountOut = amountIn * price;
    const rawAmountOut = BigInt(Math.floor(amountOut * (10 ** tokenB.decimals)));
    
    // Create quote object
    const quote = CurrencyAmount.fromRawAmount(
      tokenB instanceof Token ? tokenB : SUPPORTED_TOKENS.WETH,
      JSBI.BigInt(rawAmountOut.toString())
    );

    return {
      quote,
      route: null // We don't need actual routes for demo
    };
  } catch (error) {
    console.error("Error generating quote:", error);
    throw error;
  }
}

// Build swap parameters
export function buildSwapParameters({
  fromToken,
  toToken,
  amount,
  slippageTolerance,
  recipient
}: SwapParameters) {
  const tokenA = getTokenBySymbol(fromToken)
  const tokenB = getTokenBySymbol(toToken)

  if (!tokenA || !tokenB) {
    throw new Error('Invalid token symbols')
  }

  // Convert slippage to Uniswap Percent
  const slippagePercent = new Percent(
    JSBI.BigInt(Math.floor(slippageTolerance * 100)),
    JSBI.BigInt(10000)
  )

  // Handle ETH/WETH wrapping/unwrapping
  const needsWrapping = tokenA.isNative
  const needsUnwrapping = tokenB.isNative

  const swapParams = {
    recipient,
    slippageTolerance: slippagePercent,
    deadline: Math.floor(Date.now() / 1000) + THIRTY_MINUTES
  }

  // Return appropriate parameters based on wrapping/unwrapping needs
  if (needsWrapping) {
    return {
      ...swapParams,
      wrapWETH: true
    }
  }

  if (needsUnwrapping) {
    return {
      ...swapParams,
      unwrapWETH: true
    }
  }

  return swapParams
}

// Execute swap
export async function executeSwap(
  params: SwapParameters,
  route: Pool | null
) {
  // Demo values for universal router
  return {
    // Simple placeholder for universal router commands
    commands: '0x0802' as const,
    // Mock inputs that would be passed to router
    inputs: ['0x'] as const
  }
} 