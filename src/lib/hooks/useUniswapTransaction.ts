import { useState, useCallback } from 'react'
import { ethers } from 'ethers'
import { useEthersSigner } from './useEthersSigner'
import { getEthersProvider } from '../utils/ethersAdapter'
import { UniswapV4Client } from '../uniswap/UniswapV4Client'
import { SupportedTokenSymbol } from '../uniswap/tokens'

interface QuoteState {
  expectedOutput: string | null
  priceImpact: string | null
  loading: boolean
  error: Error | null
}

interface SwapState {
  txHash: string | null
  loading: boolean
  error: Error | null
}

export function useUniswapTransaction() {
  const { signer, isLoading: signerLoading, error: signerError } = useEthersSigner()
  const [client, setClient] = useState<UniswapV4Client | null>(null)

  const [quoteState, setQuoteState] = useState<QuoteState>({
    expectedOutput: null,
    priceImpact: null,
    loading: false,
    error: null,
  })

  const [swapState, setSwapState] = useState<SwapState>({
    txHash: null,
    loading: false,
    error: null,
  })

  // internal helper to ensure client instance exists
  const ensureClient = useCallback(async (): Promise<UniswapV4Client> => {
    if (client) return client
    const provider = await getEthersProvider()
    const newClient = new UniswapV4Client(provider, signer ?? undefined)
    if (signer) {
      await newClient.init()
    }
    setClient(newClient)
    return newClient
  }, [client, signer])

  /**
   * Get swap quote
   */
  const getQuote = useCallback(
    async (from: SupportedTokenSymbol, to: SupportedTokenSymbol, amount: string) => {
      try {
        setQuoteState((s) => ({ ...s, loading: true, error: null }))
        const cli = await ensureClient()
        const { quote, priceImpact } = await cli.getSwapQuote(from, to, amount)
        setQuoteState({
          expectedOutput: quote.toExact(),
          priceImpact: priceImpact.toSignificant(2),
          loading: false,
          error: null,
        })
      } catch (e) {
        setQuoteState({ expectedOutput: null, priceImpact: null, loading: false, error: e as Error })
      }
    },
    [ensureClient],
  )

  /**
   * Execute swap
   */
  const executeSwap = useCallback(
    async (params: {
      fromToken: SupportedTokenSymbol
      toToken: SupportedTokenSymbol
      amount: string
      slippageBps?: number
    }) => {
      try {
        setSwapState({ txHash: null, loading: true, error: null })
        const cli = await ensureClient()
        const tx = await cli.executeSwap({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountRaw: params.amount,
          slippageBps: params.slippageBps,
        })
        setSwapState({ txHash: tx.hash, loading: false, error: null })
        return tx.hash
      } catch (e) {
        setSwapState({ txHash: null, loading: false, error: e as Error })
        throw e
      }
    },
    [ensureClient],
  )

  return {
    quoteState,
    swapState,
    getQuote,
    executeSwap,
    signerLoading,
    signerError,
  }
} 