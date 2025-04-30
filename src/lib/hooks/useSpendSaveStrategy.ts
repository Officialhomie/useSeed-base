import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { Address } from 'viem';

export interface SpendSaveStrategy {
  currentPercentage: number; // In basis points (0-10000)
  autoIncrement: number; // In basis points
  maxPercentage: number; // In basis points
  goalAmount: bigint;
  roundUpSavings: boolean;
  enableDCA: boolean;
  savingsTokenType: number; // 0=INPUT, 1=OUTPUT, 2=SPECIFIC
  specificSavingsToken: Address;
  isConfigured: boolean;
}

export default function useSpendSaveStrategy() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  
  const { data: strategyData, isLoading: isStrategyLoading, refetch } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getUserSavingStrategy',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
          { name: 'currentPercentage', type: 'uint256' },
          { name: 'autoIncrement', type: 'uint256' },
          { name: 'maxPercentage', type: 'uint256' },
          { name: 'goalAmount', type: 'uint256' },
          { name: 'roundUpSavings', type: 'bool' },
          { name: 'enableDCA', type: 'bool' },
          { name: 'savingsTokenType', type: 'uint8' },
          { name: 'specificSavingsToken', type: 'address' }
        ]
      }
    ],
    functionName: 'getUserSavingStrategy',
    args: address ? [address] : undefined,
  });

  // Parse the strategy data into a more usable format
  const strategy: SpendSaveStrategy = {
    currentPercentage: strategyData ? Number(strategyData[0]) : 0,
    autoIncrement: strategyData ? Number(strategyData[1]) : 0,
    maxPercentage: strategyData ? Number(strategyData[2]) : 0,
    goalAmount: strategyData ? strategyData[3] : BigInt(0),
    roundUpSavings: strategyData ? strategyData[4] : false,
    enableDCA: strategyData ? strategyData[5] : false,
    savingsTokenType: strategyData ? Number(strategyData[6]) : 0,
    specificSavingsToken: strategyData ? strategyData[7] as Address : "0x0000000000000000000000000000000000000000" as Address,
    isConfigured: strategyData ? Number(strategyData[0]) > 0 : false
  };

  useEffect(() => {
    if (!isStrategyLoading) {
      setIsLoading(false);
    }
  }, [isStrategyLoading]);

  return {
    strategy,
    isLoading,
    refetchStrategy: refetch
  };
} 