// SPDX-License-Identifier: MIT
// src/lib/uniswap/routeBuilder.ts

import { Route, Pool } from '@uniswap/v4-sdk'
import { Token } from '@uniswap/sdk-core'
import { SUPPORTED_TOKENS, SupportedTokenSymbol } from './tokens'
import { UniswapV4Client } from './UniswapV4Client'

export interface RouteBuildOptions {
  /** If true, attach SpendSaveHook to every hop (default). */
  withHook?: boolean
}

/**
 * Build a multi-hop Route for converting savingsToken → … → destToken.
 * @param client   An instantiated UniswapV4Client with provider set.
 * @param path     Array of token symbols representing the hop order.
 *                 Example: ['ETH','USDC','DAI'] will build ETH→USDC→DAI pools.
 */
export async function buildSavingsConversionRoute(
  client: UniswapV4Client,
  path: SupportedTokenSymbol[],
  opts: RouteBuildOptions = { withHook: true },
): Promise<Route<Token, Token>> {
  if (path.length < 2) {
    throw new Error('savingsPath must contain at least 2 tokens')
  }

  const { withHook } = opts
  // Map symbols to Token objects
  const tokens: Token[] = path.map((sym) => {
    const t = SUPPORTED_TOKENS[sym] as Token | undefined
    if (!t) throw new Error(`Unsupported token symbol in path: ${sym}`)
    return t
  })

  const pools: Pool[] = []
  for (let i = 0; i < tokens.length - 1; i++) {
    const pool = await client.fetchPoolData(tokens[i], tokens[i + 1])
    if (!withHook) {
      // Clone pool with hooks = undefined (address(0))
      // @ts-expect-error accessing private
      pool.hooks = undefined as any
    }
    pools.push(pool)
  }

  return new Route<Token, Token>(pools, tokens[0], tokens[tokens.length - 1])
} 