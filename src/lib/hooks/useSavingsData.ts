import { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { formatUnits, Address, parseAbiItem } from 'viem';
import { Abi } from 'viem';
import SPEND_SAVE_STORAGE_ABI from '@/abi/core/SpendSaveStorage.json';

interface TokenSavingsData {
  totalSaved: string;
  savingsGoal: string;
  goalProgress: number;
  lastSaveTime: number;
  swapCount: number;
}

interface AllSavingsData {
  tokenSavings: { [tokenAddress: string]: TokenSavingsData };
  totalPortfolioValueUSD: string;
  totalPortfolioValueETH: string;
  savedTokensList: Address[];
  isLoading: boolean;
  savingsHistory: SavingsHistoryItem[];
}

interface SavingsHistoryItem {
  date: Date;
  token: Address;
  amount: string;
  totalSaved: string;
  transactionHash: string;
  type: 'deposit' | 'withdrawal' | 'fee';
}

// Token price mapping (you can enhance this with real price feeds)
const TOKEN_PRICES: { [symbol: string]: number } = {
  'ETH': 3000, // This should come from real price feed
  'USDC': 1,
  'WETH': 3000,
};

export default function useSavingsData() {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();
  const [allSavingsData, setAllSavingsData] = useState<AllSavingsData>({
    tokenSavings: {},
    totalPortfolioValueUSD: "0",
    totalPortfolioValueETH: "0", 
    savedTokensList: [],
    isLoading: true,
    savingsHistory: []
  });

  // Get all saved tokens for user
  const { data: savedTokensData, refetch: refetchTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: SPEND_SAVE_STORAGE_ABI as Abi,
    functionName: 'getUserSavingsTokens',
    args: address ? [address] : undefined,
    query: { enabled: !!address },
  });

  // Fetch savings history from blockchain events
  const fetchSavingsHistory = useCallback(async (): Promise<SavingsHistoryItem[]> => {
    if (!address || !publicClient) return [];
    
    try {
      // Get AmountSaved events
      const currentBlockNumber = Number(await publicClient.getBlockNumber());
      const fromBlock = BigInt(Math.max(0, currentBlockNumber - 100000));
      const amountSavedEvents = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.SAVING,
        event: parseAbiItem('event AmountSaved(address indexed user, address indexed token, uint256 amount, uint256 totalSaved)'),
        args: { user: address },
        fromBlock,
        toBlock: 'latest'
      });

      // Get SavingsWithdrawn events  
      const withdrawnEvents = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.SAVING,
        event: parseAbiItem('event SavingsWithdrawn(address indexed user, address indexed token, uint256 amount, uint256 remaining)'),
        args: { user: address },
        fromBlock,
        toBlock: 'latest'
      });

      // Get TreasuryFeeCollected events
      const feeEvents = await publicClient.getLogs({
        address: CONTRACT_ADDRESSES.SAVING,
        event: parseAbiItem('event TreasuryFeeCollected(address indexed user, address token, uint256 amount)'),
        args: { user: address },
        fromBlock,
        toBlock: 'latest'
      });

      // Combine and sort all events
      const allEvents: SavingsHistoryItem[] = [
        ...amountSavedEvents.map(event => ({
          date: new Date(Number(event.blockNumber) * 12 * 1000), // Approximate timestamp
          token: event.args.token!,
          amount: formatUnits(event.args.amount!, 18),
          totalSaved: formatUnits(event.args.totalSaved!, 18),
          transactionHash: event.transactionHash,
          type: 'deposit' as const
        })),
        ...withdrawnEvents.map(event => ({
          date: new Date(Number(event.blockNumber) * 12 * 1000),
          token: event.args.token!,
          amount: formatUnits(event.args.amount!, 18),
          totalSaved: formatUnits(event.args.remaining!, 18),
          transactionHash: event.transactionHash,
          type: 'withdrawal' as const
        })),
        ...feeEvents.map(event => ({
          date: new Date(Number(event.blockNumber) * 12 * 1000),
          token: event.args.token!,
          amount: formatUnits(event.args.amount!, 18),
          totalSaved: "0", // Fees don't affect total saved directly
          transactionHash: event.transactionHash,
          type: 'fee' as const
        }))
      ];

      return allEvents.sort((a, b) => b.date.getTime() - a.date.getTime());
    } catch (error) {
      console.error('Error fetching savings history:', error);
      return [];
    }
  }, [address, publicClient]);

  // Fetch all savings data for all tokens
  const fetchAllSavingsData = useCallback(async () => {
    if (!address || !savedTokensData || !publicClient) return;
    
    const tokens = savedTokensData as Address[];
    if (tokens.length === 0) {
      setAllSavingsData(prev => ({ ...prev, isLoading: false }));
      return;
    }

    try {
      // Fetch savings data for each token
      const tokenSavingsPromises = tokens.map(async (token) => {
        try {
          const [totalSaved, savingsData] = await Promise.all([
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
              abi: SPEND_SAVE_STORAGE_ABI as Abi,
              functionName: 'savings',
              args: [address, token]
            }),
            publicClient.readContract({
              address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
              abi: SPEND_SAVE_STORAGE_ABI as Abi,
              functionName: 'getSavingsData',
              args: [address, token]
            })
          ]);

          const formattedTotalSaved = formatUnits(totalSaved as bigint, 18);
          const [totalSavedFromData, lastSaveTime, swapCount] = savingsData as [bigint, bigint, bigint, bigint];
          
          return {
            token,
            data: {
              totalSaved: formattedTotalSaved,
              savingsGoal: "1.0", // Default goal - can be enhanced
              goalProgress: (parseFloat(formattedTotalSaved) / 1.0) * 100,
              lastSaveTime: Number(lastSaveTime),
              swapCount: Number(swapCount)
            }
          };
        } catch (error) {
          console.error(`Error fetching savings for token ${token}:`, error);
          return {
            token,
            data: {
              totalSaved: "0",
              savingsGoal: "1.0",
              goalProgress: 0,
              lastSaveTime: 0,
              swapCount: 0
            }
          };
        }
      });

      const results = await Promise.all(tokenSavingsPromises);
      
      // Build token savings mapping
      const tokenSavings: { [tokenAddress: string]: TokenSavingsData } = {};
      let totalUSD = 0;
      let totalETH = 0;

      results.forEach(({ token, data }) => {
        tokenSavings[token] = data;
        
        // Calculate portfolio totals (simplified - should use real price feeds)
        const amount = parseFloat(data.totalSaved);
        if (token === CONTRACT_ADDRESSES.ETH) {
          totalETH += amount;
          totalUSD += amount * TOKEN_PRICES.ETH;
        } else if (token === CONTRACT_ADDRESSES.USDC) {
          totalUSD += amount * TOKEN_PRICES.USDC;
          totalETH += amount / TOKEN_PRICES.ETH;
        } else if (token === CONTRACT_ADDRESSES.WETH) {
          totalETH += amount;
          totalUSD += amount * TOKEN_PRICES.WETH;
        }
      });

      // Fetch history
      const history = await fetchSavingsHistory();

      setAllSavingsData({
        tokenSavings,
        savedTokensList: tokens,
        totalPortfolioValueUSD: totalUSD.toFixed(2),
        totalPortfolioValueETH: totalETH.toFixed(6),
        savingsHistory: history,
        isLoading: false
      });

    } catch (error) {
      console.error('Error fetching all savings data:', error);
      setAllSavingsData(prev => ({ ...prev, isLoading: false }));
    }
  }, [address, savedTokensData, publicClient, fetchSavingsHistory]);

  // Fetch data when dependencies change
  useEffect(() => {
    if (isConnected && savedTokensData) {
      fetchAllSavingsData();
    } else if (!isConnected) {
      setAllSavingsData({
        tokenSavings: {},
        totalPortfolioValueUSD: "0",
        totalPortfolioValueETH: "0",
        savedTokensList: [],
        isLoading: false,
        savingsHistory: []
      });
    }
  }, [isConnected, savedTokensData, fetchAllSavingsData]);

  // Refresh function
  const refreshSavingsData = useCallback(() => {
    if (isConnected) {
      setAllSavingsData(prev => ({ ...prev, isLoading: true }));
      refetchTokens();
      fetchAllSavingsData();
    }
  }, [isConnected, refetchTokens, fetchAllSavingsData]);

  return {
    ...allSavingsData,
    refreshSavingsData
  };
}