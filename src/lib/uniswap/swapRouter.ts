import { Token, CurrencyAmount, TradeType, Percent, Currency } from '@uniswap/sdk-core'
import { Pool } from '@uniswap/v4-sdk'
import { Address } from 'viem'
import { SUPPORTED_TOKENS, CHAIN_ID, getTokenBySymbol, SupportedTokenSymbol } from './tokens'
import { CONTRACT_ADDRESSES } from '../contracts'
import JSBI from 'jsbi'

// Constants
const POOL_FEE = 3000 // 0.3%
const THIRTY_MINUTES = 1800 // 30 minutes in seconds

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
  route: Pool
}

// Get pool for token pair
async function getPool(tokenA: Token, tokenB: Token): Promise<Pool> {
  return new Pool(
    tokenA,
    tokenB,
    POOL_FEE,
    1, // tickSpacing
    CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_POOL_MANAGER, // hooks
    JSBI.BigInt('79228162514264337593543950336'), // sqrtPriceX96 (1:1 price)
    JSBI.BigInt(0), // liquidity
    0, // tick
    [] // ticks array for tick data provider
  )
}

// Get quote for swap
export async function getSwapQuote(
  fromToken: SupportedTokenSymbol,
  toToken: SupportedTokenSymbol,
  amount: bigint
): Promise<SwapRoute> {
  const tokenA = getTokenBySymbol(fromToken)
  const tokenB = getTokenBySymbol(toToken)

  if (!tokenA || !tokenB) {
    throw new Error('Invalid token symbols')
  }

  // Handle ETH/WETH conversion
  const inputToken = tokenA.isNative ? SUPPORTED_TOKENS.WETH : tokenA as Token
  const outputToken = tokenB.isNative ? SUPPORTED_TOKENS.WETH : tokenB as Token

  const pool = await getPool(inputToken, outputToken)
  
  const amountIn = CurrencyAmount.fromRawAmount(
    inputToken,
    JSBI.BigInt(amount.toString())
  )

  // Calculate quote using pool's getOutputAmount
  const [outputAmount] = await pool.getOutputAmount(amountIn)

  // Cast the output amount to the correct token type
  const quote = CurrencyAmount.fromRawAmount(
    outputToken,
    outputAmount.quotient
  )

  return {
    quote,
    route: pool
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
  route: Pool
) {
  const swapParams = buildSwapParameters(params)
  
  // Since SwapRouter is not available in v4-sdk, we'll return the raw parameters
  // that will be used by the Universal Router contract
  return {
    commands: '0x' as const,
    inputs: [] as const
  }
} 