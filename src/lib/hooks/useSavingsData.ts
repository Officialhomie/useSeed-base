import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { formatUnits, Address } from 'viem';

interface SavingsData {
  totalSaved: {
    [token: string]: string; // Token address to amount mapping
  };
  savingsGoal: string;
  goalProgress: number;
  totalValueUSD: string;
  isLoading: boolean;
}

export default function useSavingsData(tokenAddress?: Address) {
  const { address, isConnected } = useAccount();
  const [savingsData, setSavingsData] = useState<SavingsData>({
    totalSaved: {},
    savingsGoal: "1.0", // Default goal of 1 ETH/token
    goalProgress: 0,
    totalValueUSD: "0",
    isLoading: true
  });

  // Read total saved amount for the user
  const { data: totalSavedData, isLoading: isLoadingSaved } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getUserTotalSaved',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'user', type: 'address' },
          { name: 'token', type: 'address' }
        ],
        outputs: [{ name: 'amount', type: 'uint256' }]
      }
    ],
    functionName: 'getUserTotalSaved',
    args: address && tokenAddress ? [address, tokenAddress] : undefined,
    query: { enabled: !!address && !!tokenAddress },
  });

  // Read savings goal
  const { data: savingsGoalData, isLoading: isLoadingGoal } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getUserSavingsGoal',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
          { name: 'goalAmount', type: 'uint256' },
          { name: 'goalToken', type: 'address' }
        ]
      }
    ],
    functionName: 'getUserSavingsGoal',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Read all saved tokens for the user
  const { data: savedTokensData, isLoading: isLoadingTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getUserSavedTokens',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: 'tokens', type: 'address[]' }]
      }
    ],
    functionName: 'getUserSavedTokens',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Process the data and update the state
  useEffect(() => {
    if (!isConnected) {
      setSavingsData({
        totalSaved: {},
        savingsGoal: "1.0",
        goalProgress: 0,
        totalValueUSD: "0",
        isLoading: false
      });
      return;
    }

    const isLoading = isLoadingSaved || isLoadingGoal || isLoadingTokens;
    
    if (!isLoading && totalSavedData !== undefined && tokenAddress) {
      // Format the total saved amount for the specified token
      const formattedAmount = formatUnits(totalSavedData, 18);
      
      // Calculate goal progress if we have the goal data
      let goalProgress = 0;
      let goalAmount = "1.0";
      
      if (savingsGoalData) {
        goalAmount = formatUnits(savingsGoalData[0], 18);
        
        // Only calculate progress if the goal token matches our token
        if (savingsGoalData[1] === tokenAddress) {
          const savedAmount = parseFloat(formattedAmount);
          const goalAmountFloat = parseFloat(goalAmount);
          
          if (goalAmountFloat > 0) {
            goalProgress = Math.min(100, (savedAmount / goalAmountFloat) * 100);
          }
        }
      }
      
      // Update the state with the new data
      setSavingsData(prev => ({
        ...prev,
        totalSaved: {
          ...prev.totalSaved,
          [tokenAddress]: formattedAmount
        },
        savingsGoal: goalAmount,
        goalProgress,
        isLoading: false
      }));
    }
  }, [
    isConnected, 
    totalSavedData, 
    savingsGoalData, 
    savedTokensData, 
    isLoadingSaved, 
    isLoadingGoal, 
    isLoadingTokens,
    tokenAddress,
    address
  ]);

  return savingsData;
} 