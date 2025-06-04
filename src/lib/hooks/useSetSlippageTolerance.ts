import { useCallback } from 'react'
import { Address } from 'viem'
import { useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import slippageControlAbi from '@/abi/trading/SlippageControl.json'

export function useSetSlippageTolerance() {
  const {
    writeContract,
    isPending: isLoading,
    isSuccess,
    error,
    data,
  } = useWriteContract()

  const setSlippage = useCallback(
    async (user: Address, basisPoints: bigint) => {
      if (!writeContract) throw new Error('Contract write not ready')
      return writeContract({
        address: CONTRACT_ADDRESSES.SLIPPAGE_CONTROL,
        abi: slippageControlAbi as any,
        functionName: 'setSlippageTolerance',
        args: [user, basisPoints],
      })
    },
    [writeContract],
  )

  return { setSlippage, isLoading, isSuccess, error, data }
} 