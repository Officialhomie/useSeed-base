import { Token, Ether } from '@uniswap/sdk-core'
import { CONTRACT_ADDRESSES } from '../contracts'

// Chain ID for Base Sepolia
export const CHAIN_ID = 84532

// Native ETH representation using sdk-core helper
export const NATIVE_ETH = {
  ...Ether.onChain(CHAIN_ID),
  address: CONTRACT_ADDRESSES.ETH,
}

// Token Instances using Uniswap SDK
export const WETH = new Token(
  CHAIN_ID,
  CONTRACT_ADDRESSES.WETH,
  18,
  'WETH',
  'Wrapped Ether'
)

export const USDC = new Token(
  CHAIN_ID,
  CONTRACT_ADDRESSES.USDC,
  6,
  'USDC',
  'USD Coin'
)

// DAI token on Base Sepolia
export const DAI = new Token(
  CHAIN_ID,
  '0x50c5725949A6F0c72E6C4a641F24049A917DB0Cb', // Base Sepolia DAI address
  18,
  'DAI',
  'Dai Stablecoin'
)

// All supported tokens
export const SUPPORTED_TOKENS = {
  ETH: NATIVE_ETH,
  WETH,
  USDC,
  DAI,
} as const

// Flat registry keyed by lowercase address → metadata
export const TOKEN_REGISTRY: Record<string, { symbol: string; name: string; decimals: number }> =
  Object.values(SUPPORTED_TOKENS).reduce((acc, t) => {
    acc[t.address.toLowerCase()] = {
      symbol: (t as any).symbol ?? 'UNK',
      name: (t as any).name ?? 'Unknown',
      decimals: t.decimals,
    }
    return acc
  }, {} as Record<string, { symbol: string; name: string; decimals: number }>)

// Describe token metadata from address
export function describeToken(addr: string) {
  return TOKEN_REGISTRY[addr.toLowerCase()] ?? { symbol: 'Unknown', name: 'Unknown Token', decimals: 18 }
}

// Helper to get token by symbol
export function getTokenBySymbol(symbol: keyof typeof SUPPORTED_TOKENS) {
  return SUPPORTED_TOKENS[symbol]
}

// Helper to get token by address
export function getTokenByAddress(address: string) {
  return Object.values(SUPPORTED_TOKENS).find(
    token => token.address.toLowerCase() === address.toLowerCase()
  )
}

// All supported token symbols
export type SupportedTokenSymbol = keyof typeof SUPPORTED_TOKENS

// Pairs that we support for direct swaps
export const SUPPORTED_PAIRS = [
  // ETH pairs
  ['ETH', 'WETH'],
  ['ETH', 'USDC'],
  ['ETH', 'DAI'],
  // WETH pairs
  ['WETH', 'USDC'],
  ['WETH', 'DAI'],
  // Stablecoin pairs
  ['USDC', 'DAI'],
] as const

// Validate if a pair is supported
export function isPairSupported(
  tokenA: SupportedTokenSymbol,
  tokenB: SupportedTokenSymbol
): boolean {
  return SUPPORTED_PAIRS.some(
    ([a, b]) =>
      (a === tokenA && b === tokenB) || (a === tokenB && b === tokenA)
  )
} 