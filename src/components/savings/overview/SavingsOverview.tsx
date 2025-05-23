import React, { useState, useEffect, useCallback } from 'react';
import { useAccount, useReadContract, usePublicClient } from 'wagmi';
import { Address, formatUnits, Abi } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { motion, AnimatePresence } from 'framer-motion';
import { FiArrowUp, FiBarChart2, FiDollarSign, FiTarget, FiClock, FiAward, FiAlertCircle } from 'react-icons/fi';
import AnimatedProgressBar from '@/components/onboarding/AnimatedProgressBar';
import SavingsCalculator from '@/components/savings/visualisation/SavingsCalculator';

// Import ABIs
import SPEND_SAVE_STORAGE_ABI from '@/abi/core/SpendSaveStorage.json';

// Custom animated counter component
const AnimatedCounter = ({ value, decimals = 2 }: { value: number, decimals?: number }) => {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      {value.toFixed(decimals)}
    </motion.span>
  );
};

// Token icon component
const TokenIcon = ({ symbol }: { symbol: string }) => {
  const getIconBackground = () => {
    switch (symbol) {
      case 'ETH': return 'bg-blue-500/20 text-blue-400';
      case 'USDC': return 'bg-green-500/20 text-green-400';
      case 'WETH': return 'bg-purple-500/20 text-purple-400';
      default: return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <div className={`w-10 h-10 rounded-full ${getIconBackground()} flex items-center justify-center`}>
      <span className="font-bold">{symbol.charAt(0)}</span>
    </div>
  );
};

// Component to display a summary of a user's savings
export default function SavingsOverview() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(true);
  const [totalSavingsValue, setTotalSavingsValue] = useState('0');
  const [savingsGoal, setSavingsGoal] = useState('0');
  const [goalProgress, setGoalProgress] = useState(0);
  const [savedTokens, setSavedTokens] = useState<Address[]>([]);
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: string}>({});
  const [goalToken, setGoalToken] = useState<Address | undefined>(undefined);
  const [selectedTimeframe, setSelectedTimeframe] = useState<'daily' | 'weekly' | 'monthly'>('weekly');
  const [showEmptyState, setShowEmptyState] = useState(false);

  // Access Viem public client for direct contract reads (non-hook).
  const publicClient = usePublicClient();

  // Get token symbol from address
  const getTokenSymbol = useCallback((tokenAddress: Address): string => {
    if (tokenAddress === CONTRACT_ADDRESSES.ETH) return 'ETH';
    if (tokenAddress === CONTRACT_ADDRESSES.USDC) return 'USDC';
    if (tokenAddress === CONTRACT_ADDRESSES.WETH) return 'WETH';
    return 'Unknown';
  }, []);

  // Read all saved tokens for the user
  const { data: savedTokensData, isLoading: isLoadingTokens, refetch: refetchTokens } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: SPEND_SAVE_STORAGE_ABI as Abi,
    functionName: 'getUserSavedTokens',
    args: address ? [address] : undefined,
  });

  // Read savings goal
  const { data: savingsGoalData, isLoading: isLoadingGoal, refetch: refetchGoal } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: SPEND_SAVE_STORAGE_ABI as Abi,
    functionName: 'getUserSavingsGoal',
    args: address ? [address] : undefined,
  });

  // Fetch token balances for each saved token
  const fetchTokenBalances = useCallback(async () => {
    if (!savedTokensData || !address || !isConnected) return;
    
    const tokens = savedTokensData as Address[];
    setSavedTokens(tokens);
    
    if (tokens.length === 0) {
      setIsLoading(false);
      setShowEmptyState(true);
      return;
    }

    // Fetch balances using the viem public client directly (avoids React Hook restrictions).
    if (!publicClient) return;

    const balanceResults = await Promise.all(
      tokens.map((token) =>
        publicClient.readContract({
          address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
          abi: SPEND_SAVE_STORAGE_ABI as Abi,
          functionName: 'getUserTotalSaved',
          args: [address as Address, token],
        })
      )
    );

    if (balanceResults) {
      const balances: {[key: string]: string} = {};
      let totalSaved = 0;

      tokens.forEach((token, index) => {
        const raw = balanceResults[index] as bigint | undefined;
        if (raw !== undefined) {
          const balance = formatUnits(raw, 18);
          balances[token] = balance;
          totalSaved += parseFloat(balance);
        } else {
          balances[token] = '0';
        }
      });

      setTokenBalances(balances);
      setTotalSavingsValue(totalSaved.toFixed(2));
      setShowEmptyState(tokens.length === 0);
    }
    
    setIsLoading(false);
  }, [savedTokensData, address, isConnected, publicClient]);

  // Process savings goal data
  useEffect(() => {
    if (!savingsGoalData || !address || !isConnected) return;
    
    try {
      // Properly type the savings goal data as an array with two elements
      const goalData = savingsGoalData as [bigint, Address];
      const goalAmount = formatUnits(goalData[0], 18);
      const goalTokenAddress = goalData[1];
      
      setSavingsGoal(goalAmount);
      setGoalToken(goalTokenAddress);
      
      // Calculate progress if we have the balance for the goal token
      if (goalTokenAddress && tokenBalances[goalTokenAddress]) {
        const currentAmount = parseFloat(tokenBalances[goalTokenAddress]);
        const goalAmountFloat = parseFloat(goalAmount);
        
        if (goalAmountFloat > 0) {
          setGoalProgress(Math.min(100, (currentAmount / goalAmountFloat) * 100));
        }
      }
    } catch (error) {
      console.error('Error processing savings goal data:', error);
    }
  }, [savingsGoalData, tokenBalances, address, isConnected]);

  // Fetch balances when tokens change
  useEffect(() => {
    if (savedTokensData && address && isConnected) {
      fetchTokenBalances();
    }
  }, [savedTokensData, address, isConnected, fetchTokenBalances]);

  // Refresh data
  const refreshData = useCallback(() => {
    if (isConnected) {
      setIsLoading(true);
      refetchTokens();
      refetchGoal();
      fetchTokenBalances();
    }
  }, [refetchTokens, refetchGoal, fetchTokenBalances, isConnected]);

  // Calculate projected savings based on current rate
  const getProjectedSavings = () => {
    const currentTotal = parseFloat(totalSavingsValue);
    
    // Estimate based on 2 swaps per week on average and today's amount
    if (currentTotal <= 0) return { daily: 0, weekly: 0, monthly: 0 };
    
    const perSwap = currentTotal / (savedTokens.length * 5); // Rough estimate
    const daily = perSwap * 0.5; // Assuming 0.5 swaps per day on average
    const weekly = daily * 7;
    const monthly = weekly * 4.33; // Average weeks per month
    
    return { daily, weekly, monthly };
  };
  
  const projections = getProjectedSavings();

  // Render the "Not connected" state
  if (!isConnected) {
    return (
      <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 mb-6">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-800/80 flex items-center justify-center">
            <FiAlertCircle size={28} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">Wallet Not Connected</h3>
          <p className="text-gray-400 max-w-sm mx-auto">Connect your wallet to view your savings data and track your progress.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 mb-6 overflow-hidden">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-400">
            Savings Overview
          </h2>
          <p className="text-sm text-gray-400 mt-1">Real-time summary of your savings across all tokens</p>
        </div>
        <motion.button 
          onClick={refreshData}
          className="bg-gray-800 hover:bg-gray-700 p-2 rounded-full transition-colors"
          title="Refresh data"
          whileTap={{ scale: 0.95 }}
          disabled={isLoading}
        >
          <svg className={`w-5 h-5 ${isLoading ? 'animate-spin text-blue-400' : 'text-gray-400'}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M4 4V9H4.58152M19.9381 11C19.446 7.05369 16.0796 4 12 4C8.64262 4 5.76829 6.06817 4.58152 9M4.58152 9H9M20 20V15H19.4185M19.4185 15C18.2317 17.9318 15.3574 20 12 20C7.92038 20 4.55399 16.9463 4.06189 13M19.4185 15H15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </motion.button>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-blue-500"></div>
          <span className="ml-3 text-gray-400">Loading savings data...</span>
        </div>
      ) : showEmptyState ? (
        <div className="text-center py-10">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-blue-500/10 flex items-center justify-center">
            <FiDollarSign size={28} className="text-blue-400" />
          </div>
          <h3 className="text-lg font-medium text-white mb-2">No Savings Yet</h3>
          <p className="text-gray-400 max-w-sm mx-auto mb-6">Start saving by making your first swap with savings enabled.</p>
          <motion.a 
            href="/app-dashboard/swap"
            className="inline-flex items-center px-4 py-2 rounded-lg bg-blue-500 hover:bg-blue-600 text-white font-medium transition-colors"
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
          >
            Make Your First Swap
            <svg className="ml-2 w-4 h-4" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </motion.a>
        </div>
      ) : (
        <>
          {/* Savings Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <motion.div 
              className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Total Tokens Saved</p>
                  <p className="text-white text-2xl font-bold mt-1.5">
                    <AnimatedCounter value={parseFloat(totalSavingsValue)} />
                  </p>
                </div>
                <div className="p-3 bg-blue-500/20 rounded-full">
                  <FiDollarSign className="text-blue-400" size={20} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-blue-500/20">
                <p className="text-xs text-blue-400">
                  <span className="inline-flex items-center">
                    <FiArrowUp className="mr-1" size={12} />
                    Growing your crypto assets safely
                  </span>
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-green-500/10 border border-green-500/30 rounded-lg p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Token Types Saved</p>
                  <p className="text-white text-2xl font-bold mt-1.5">
                    <AnimatedCounter value={savedTokens.length} decimals={0} />
                  </p>
                </div>
                <div className="p-3 bg-green-500/20 rounded-full">
                  <FiBarChart2 className="text-green-400" size={20} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-green-500/20">
                <p className="text-xs text-green-400">
                  <span className="inline-flex items-center">
                    <FiAward className="mr-1" size={12} />
                    Diversified savings portfolio
                  </span>
                </p>
              </div>
            </motion.div>
            
            <motion.div 
              className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-5"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="text-gray-400 text-sm">Goal Progress</p>
                  <p className="text-white text-2xl font-bold mt-1.5">
                    <AnimatedCounter value={goalProgress} />%
                  </p>
                </div>
                <div className="p-3 bg-purple-500/20 rounded-full">
                  <FiTarget className="text-purple-400" size={20} />
                </div>
              </div>
              <div className="mt-3 pt-3 border-t border-purple-500/20">
                <p className="text-xs text-purple-400">
                  <span className="inline-flex items-center">
                    <FiClock className="mr-1" size={12} />
                    {goalProgress < 50 ? 'Just getting started' : goalProgress < 90 ? 'Making good progress' : 'Almost there!'}
                  </span>
                </p>
              </div>
            </motion.div>
          </div>
          
          {/* Projection Tabs and Savings Goal */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-8">
            {/* Left column - Projections */}
            <div className="md:col-span-3">
              <div className="bg-gray-800/40 rounded-xl p-5 h-full">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-sm font-medium text-white">Projected Savings Growth</h3>
                  <div className="flex space-x-1 bg-gray-900/80 p-1 rounded-lg">
                    {['daily', 'weekly', 'monthly'].map((period) => (
                      <button
                        key={period}
                        className={`px-3 py-1 text-xs rounded-md transition-colors ${
                          selectedTimeframe === period
                            ? 'bg-blue-500 text-white'
                            : 'text-gray-400 hover:text-white'
                        }`}
                        onClick={() => setSelectedTimeframe(period as any)}
                      >
                        {period.charAt(0).toUpperCase() + period.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <AnimatePresence mode="wait">
                  <motion.div
                    key={selectedTimeframe}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.3 }}
                    className="mt-4"
                  >
                    <div className="flex items-center justify-between">
                      <div className="text-center p-3 bg-gray-900/60 rounded-lg flex-1 mx-1">
                        <p className="text-gray-400 text-xs mb-1">Current</p>
                        <p className="text-white font-medium">
                          {totalSavingsValue}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-blue-500/10 rounded-lg flex-1 mx-1">
                        <p className="text-blue-400 text-xs mb-1">+ 3 months</p>
                        <p className="text-white font-medium">
                          {(parseFloat(totalSavingsValue) + (projections[selectedTimeframe] * 12)).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-green-500/10 rounded-lg flex-1 mx-1">
                        <p className="text-green-400 text-xs mb-1">+ 6 months</p>
                        <p className="text-white font-medium">
                          {(parseFloat(totalSavingsValue) + (projections[selectedTimeframe] * 24)).toFixed(2)}
                        </p>
                      </div>
                      <div className="text-center p-3 bg-purple-500/10 rounded-lg flex-1 mx-1">
                        <p className="text-purple-400 text-xs mb-1">+ 1 year</p>
                        <p className="text-white font-medium">
                          {(parseFloat(totalSavingsValue) + (projections[selectedTimeframe] * 52)).toFixed(2)}
                        </p>
                      </div>
                    </div>
                    <p className="text-center text-xs text-gray-500 mt-3">
                      Projections based on your current savings rate ({projections[selectedTimeframe].toFixed(4)} per {selectedTimeframe.slice(0, -2)}y period)
                    </p>
                  </motion.div>
                </AnimatePresence>
              </div>
            </div>
            
            {/* Right column - Goal Progress */}
            <div className="md:col-span-2">
              {parseFloat(savingsGoal) > 0 && (
                <motion.div 
                  className="bg-gray-800/40 rounded-xl p-5 h-full"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.4 }}
                >
                  <div className="flex justify-between items-center mb-4">
                    <h3 className="text-sm font-medium text-white flex items-center">
                      <FiTarget className="mr-2 text-purple-400" />
                      Savings Goal Progress
                    </h3>
                    <span className="text-sm text-white">{goalProgress.toFixed(1)}%</span>
                  </div>
                  
                  <AnimatedProgressBar 
                    progress={goalProgress} 
                    color="gradient" 
                    height={10}
                    className="mb-3" 
                  />
                  
                  <div className="flex justify-between mt-3">
                    <div className="text-sm">
                      <span className="text-gray-400 block">Current</span>
                      <span className="text-white font-medium">
                        {tokenBalances[goalToken || ''] || '0'} {goalToken ? getTokenSymbol(goalToken) : ''}
                      </span>
                    </div>
                    <div className="text-right text-sm">
                      <span className="text-gray-400 block">Goal</span>
                      <span className="text-white font-medium">
                        {savingsGoal} {goalToken ? getTokenSymbol(goalToken) : ''}
                      </span>
                    </div>
                  </div>
                  
                  {/* Time to goal estimate */}
                  <div className="mt-4 pt-4 border-t border-gray-700">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400">Estimated time to goal:</span>
                      <span className="text-white font-medium">
                        {projections.weekly > 0 
                          ? `${Math.ceil((parseFloat(savingsGoal) - parseFloat(tokenBalances[goalToken || ''] || '0')) / projections.weekly / 4)} months`
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}
            </div>
          </div>
          
          {/* Savings Calculator */}
          <div className="mb-8">
            <h3 className="text-sm font-medium text-white mb-4 flex items-center">
              <FiBarChart2 className="mr-2 text-blue-400" />
              <span>Savings Impact Calculator</span>
            </h3>
            <SavingsCalculator
              fromAmount="1.0"
              fromToken={savedTokens.length > 0 ? getTokenSymbol(savedTokens[0]) : "ETH"}
              tokenPrice={3000}
              strategy={{
                isConfigured: true,
                currentPercentage: 1000, // 10%
                autoIncrement: 100,
                maxPercentage: 2000,
                goalAmount: BigInt(0),
                roundUpSavings: false,
                enableDCA: false,
                savingsTokenType: 0,
                specificSavingsToken: "0x0000000000000000000000000000000000000000" as Address,
              }}
              overridePercentage={null}
              disableSavings={false}
              totalSaved={totalSavingsValue}
              savingsGoalProgress={goalProgress}
            />
          </div>
          
          {/* Saved Tokens List */}
          <div>
            <h3 className="text-sm font-medium text-white mb-4 flex items-center">
              <TokenIcon symbol="ETH" />
              <span className="ml-2">Your Saved Tokens</span>
            </h3>
            <div className="space-y-3">
              {savedTokens.length > 0 ? (
                savedTokens.map((token, index) => {
                  const tokenSymbol = getTokenSymbol(token);
                  const tokenAmount = parseFloat(tokenBalances[token] || '0');
                  const tokenPercentage = (tokenAmount / parseFloat(totalSavingsValue)) * 100;
                  
                  return (
                    <motion.div 
                      key={index} 
                      className="bg-gray-800/60 rounded-lg p-4"
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.1 }}
                      whileHover={{ scale: 1.01 }}
                    >
                      <div className="flex justify-between items-center mb-3">
                        <div className="flex items-center">
                          <TokenIcon symbol={tokenSymbol} />
                          <div className="ml-3">
                            <p className="text-white font-medium">{tokenSymbol}</p>
                            <p className="text-gray-400 text-xs">{token.slice(0, 6)}...{token.slice(-4)}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-white font-medium">{tokenAmount.toFixed(6)} {tokenSymbol}</p>
                          <p className="text-xs text-gray-400">
                            {/* We would typically show USD value here from an oracle */}
                            {tokenSymbol === 'ETH' ? `≈ $${(tokenAmount * 3000).toFixed(2)}` : ''}
                            {tokenSymbol === 'USDC' ? `≈ $${tokenAmount.toFixed(2)}` : ''}
                            {tokenSymbol === 'WETH' ? `≈ $${(tokenAmount * 3000).toFixed(2)}` : ''}
                          </p>
                        </div>
                      </div>
                      
                      {/* Token percentage of total savings */}
                      <AnimatedProgressBar 
                        progress={tokenPercentage} 
                        color={tokenSymbol === 'ETH' ? 'blue' : tokenSymbol === 'USDC' ? 'green' : 'purple'} 
                        height={6}
                        showLabels
                        startLabel="0"
                        endLabel={`${tokenPercentage.toFixed(1)}% of savings`}
                      />
                    </motion.div>
                  );
                })
              ) : (
                <div className="bg-gray-800/60 rounded-lg p-6 text-center">
                  <p className="text-gray-400">No tokens saved yet</p>
                  <p className="text-xs text-gray-500 mt-1">Start by making a swap with savings enabled</p>
                </div>
              )}
            </div>
            
            {/* Actions */}
            {savedTokens.length > 0 && (
              <motion.div 
                className="mt-6 flex justify-end"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8 }}
              >
                <a href="/app-dashboard/swap" className="py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors mr-3">
                  Swap & Save More
                </a>
                <a href="/app-dashboard/dca" className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors">
                  Setup DCA Plan
                </a>
              </motion.div>
            )}
          </div>
        </>
      )}
    </div>
  );
} 