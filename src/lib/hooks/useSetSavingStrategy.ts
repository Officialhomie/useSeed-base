import { useCallback } from 'react'
import { Address } from 'viem'
import { useWriteContract } from 'wagmi'
import { CONTRACT_ADDRESSES } from '@/lib/contracts'
import savingStrategyAbi from "@/abi/savings/SavingStrategy.json";

/**
 * Hook that returns a function for writing the user SavingStrategy.
 * You can call it from a form and then handle the returned transaction hash.
 */
export function useSetSavingStrategy() {
  const {
    writeContract,
    isPending: isLoading,
    isSuccess,
    error,
    data,
  } = useWriteContract()

  /**
   * Call this with the exact parameters the Solidity function expects.
   * Example:
   *   await setStrategy(
   *     user,
   *     500n,   // 5% (basis points)
   *     10n,    // autoIncrement
   *     1000n,  // maxPercentage
   *     0n,     // goalAmount
   *     false,  // roundUpSavings
   *     true,   // enableDCA
   *     0,      // savingsTokenType (enum)
   *     '0x000...'
   *   )
   */
  const setStrategy = useCallback(
    async (
      user: Address,
      percentage: bigint,
      autoIncrement: bigint,
      maxPercentage: bigint,
      goalAmount: bigint,
      roundUpSavings: boolean,
      enableDCA: boolean,
      savingsTokenType: number,
      specificSavingsToken: Address,
    ) => {
      if (!writeContract) throw new Error('Contract write not ready')
      return writeContract({
        address: CONTRACT_ADDRESSES.SAVING_STRATEGY,
        abi: savingStrategyAbi as any,
        functionName: 'setSavingStrategy',
        args: [
          user,
          percentage,
          autoIncrement,
          maxPercentage,
          goalAmount,
          roundUpSavings,
          enableDCA,
          savingsTokenType,
          specificSavingsToken,
        ],
      })
    },
    [writeContract],
  )

  return {
    setStrategy,
    isLoading,
    isSuccess,
    error,
    data, // tx data / hash
  }
} 