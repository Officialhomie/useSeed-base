import { Token, Percent } from '@uniswap/sdk-core'
import { Address } from 'viem'
import { SUPPORTED_TOKENS, getTokenBySymbol, SupportedTokenSymbol } from './tokens'
import JSBI from 'jsbi'

// Constants
const THIRTY_MINUTES = 1800 // 30 minutes in seconds

// Types
interface SwapParameters {
  fromToken: SupportedTokenSymbol
  toToken: SupportedTokenSymbol
  amount: bigint
  slippageTolerance: number
  recipient: Address
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
  params: SwapParameters
) {
  // Demo values for universal router
  return {
    // Simple placeholder for universal router commands
    commands: '0x0802' as const,
    // Mock inputs that would be passed to router
    inputs: ['0x'] as const
  }
}