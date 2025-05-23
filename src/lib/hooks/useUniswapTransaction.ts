import { useState, useCallback } from 'react'
import { useEthersSigner } from './useEthersSigner'
import { getEthersProvider } from '../utils/ethersAdapter'
import type { UniswapV4Client } from '../uniswap/UniswapV4Client'
import { SupportedTokenSymbol } from '../uniswap/tokens'
import { computeDynamicSlippage } from '../slippage/computeDynamicSlippage'
import { useAccount } from 'wagmi'

interface SwapState {
  txHash: string | null
  loading: boolean
  error: Error | null
}

export function useUniswapTransaction() {
  const { signer, isLoading: signerLoading, error: signerError } = useEthersSigner()
  const { address } = useAccount()
  const [client, setClient] = useState<UniswapV4Client | null>(null)

  const [swapState, setSwapState] = useState<SwapState>({
    txHash: null,
    loading: false,
    error: null,
  })

  // internal helper to ensure client instance exists
  const ensureClient = useCallback(async (): Promise<UniswapV4Client> => {
    if (client) {
      // If wallet address became available later, ensure client has it
      if (!client.userAddress && address) {
        try {
          await client.init(address)
        } catch (_) {
          // ignore re-init errors
        }
      }
      return client
    }
    
    // Create a new client
    const provider = await getEthersProvider()
    const { UniswapV4Client } = await import('../uniswap/UniswapV4Client')
    const newClient = new UniswapV4Client(provider, signer ?? undefined)
    
    // Try to initialize with address first (preferred method to avoid signer.getAddress call)
    if (address) {
      try {
        await newClient.init(address)
      } catch (err) {
        console.error('Error initializing client with address:', err)
        // If address init fails and we have a signer, try that as fallback
        if (signer) {
          try {
            await newClient.init()
          } catch (signerErr) {
            console.error('Error initializing client with signer:', signerErr)
            // Continue without initialization - some functionality will be limited
          }
        }
      }
    }
    
    setClient(newClient)
    return newClient
  }, [client, signer, address])

  /**
   * Execute swap
   */
  const executeSwap = useCallback(
    async (params: {
      fromToken: SupportedTokenSymbol
      toToken: SupportedTokenSymbol
      amount: string
      slippage: 'auto' | number
      gasOverrideGwei?: number
      hookFlags?: import('../uniswap/types').HookFlags
      savingsPath?: SupportedTokenSymbol[]
    }) => {
      try {
        setSwapState({ txHash: null, loading: true, error: null })
        const cli = await ensureClient()

        let slippageBps: number | undefined
        if (params.slippage === 'auto') {
          // Use a reasonable default for auto slippage since we don't have quotes
          const defaultPriceImpact = 0.5; // 0.5% default
          const priceImpactBps = defaultPriceImpact * 100
          slippageBps = computeDynamicSlippage(priceImpactBps)
        } else if (typeof params.slippage === 'number') {
          slippageBps = params.slippage
        }

        const tx = await cli.executeSwap({
          fromToken: params.fromToken,
          toToken: params.toToken,
          amountRaw: params.amount,
          slippageBps,
          gasOverrideGwei: params.gasOverrideGwei,
          hookFlags: params.hookFlags,
          savingsPath: params.savingsPath || [],
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
    swapState,
    executeSwap,
    signerLoading,
    signerError,
  }
}