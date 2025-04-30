import React, { useCallback } from 'react';
import { FiPieChart, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import { calculateSavingsAmount } from '@/lib/utils/savingsCalculator';
import { Address } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { useAccount, useReadContract } from 'wagmi';
import AnimatedProgressBar from './AnimatedProgressBar';
import { motion } from 'framer-motion';

interface SavingsVisualizerProps {
  fromAmount: string;
  fromToken: string;
  tokenPrice: number;
  strategy: SpendSaveStrategy;
  overridePercentage: number | null;
  disableSavings: boolean;
}

const SavingsVisualizerV2: React.FC<SavingsVisualizerProps> = ({
  fromAmount,
  fromToken,
  tokenPrice,
  strategy,
  overridePercentage,
  disableSavings
}) => {
  const { address } = useAccount();
  
  // Get token address from symbol
  const getTokenAddress = useCallback((symbol: string): Address => {
    if (symbol === "ETH") return CONTRACT_ADDRESSES.ETH;
    if (symbol === "USDC") return CONTRACT_ADDRESSES.USDC;
    if (symbol === "WETH") return CONTRACT_ADDRESSES.WETH;
    return CONTRACT_ADDRESSES.ETH; // Default to ETH
  }, []);

  // Get total saved for the current token
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
    args: address ? [address, getTokenAddress(fromToken)] : undefined,
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
  });

  // Estimates
  const calculateSavingsForPeriod = () => {
    if (!fromAmount || isNaN(parseFloat(fromAmount)) || !strategy.isConfigured || disableSavings) {
      return { perSwap: '0', weekly: '0', monthly: '0', yearly: '0', usdValue: '0' };
    }
    
    const savingsPerSwap = parseFloat(calculateSavingsAmount(
      fromAmount,
      strategy,
      overridePercentage,
      disableSavings
    ));
    
    // Assuming 2 swaps per week on average
    const weeklySwaps = 2;
    const weeklyAmount = savingsPerSwap * weeklySwaps;
    const monthlyAmount = weeklyAmount * 4.33; // Average weeks per month
    const yearlyAmount = weeklyAmount * 52;
    
    // Calculate USD value
    const usdValue = yearlyAmount * tokenPrice;
    
    return {
      perSwap: savingsPerSwap.toFixed(6),
      weekly: weeklyAmount.toFixed(6),
      monthly: monthlyAmount.toFixed(6),
      yearly: yearlyAmount.toFixed(6),
      usdValue: usdValue.toFixed(2)
    };
  };
  
  // Format and process contract data
  const totalSaved = totalSavedData ? totalSavedData.toString() : '0';
  
  const goalAmount = savingsGoalData && savingsGoalData[0] ? 
    savingsGoalData[0].toString() : '1000000000000000000'; // Default to 1 ETH
  
  const goalTokenAddress = savingsGoalData && savingsGoalData[1] ? 
    savingsGoalData[1] : getTokenAddress(fromToken);
  
  // Only show progress if the goal token matches the current token
  const showProgress = goalTokenAddress === getTokenAddress(fromToken);
  
  // Calculate goal progress
  const goalProgress = showProgress && totalSavedData && savingsGoalData ? 
    Math.min(100, (Number(totalSavedData) / Number(savingsGoalData[0])) * 100) : 0;
  
  const isLoading = isLoadingSaved || isLoadingGoal;
  const savings = calculateSavingsForPeriod();
  
  if (isLoading) {
    return (
      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
        <p className="text-center text-gray-400">Loading savings data...</p>
      </div>
    );
  }
  
  return (
    <motion.div 
      className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-5"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h3 className="text-sm font-medium text-blue-400 mb-3 flex items-center">
        <FiPieChart className="mr-2" />
        Savings Impact Calculator
      </h3>
      
      {/* Total Saved So Far */}
      <div className="mb-4">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-400">Total saved so far:</span>
          <span className="text-white font-medium">{totalSaved} {fromToken}</span>
        </div>
        
        {/* Progress Bar using the new component */}
        <AnimatedProgressBar 
          progress={goalProgress} 
          color="blue" 
          height={8}
          showLabels
          startLabel={`0 ${fromToken}`}
          endLabel={`Goal: ${goalAmount} ${fromToken}`}
        />
      </div>
      
      {/* Savings Breakdown */}
      <div className="bg-gray-800/40 rounded-lg p-4 text-xs">
        <h4 className="text-gray-300 font-medium mb-3 flex items-center">
          <FiTrendingUp className="mr-1.5 text-blue-400" />
          Projected Savings (assuming regular swaps)
        </h4>
        <div className="space-y-2">
          <div className="flex justify-between">
            <span className="text-gray-400">Per swap:</span>
            <span className="text-white">{savings.perSwap} {fromToken}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Weekly (2 swaps):</span>
            <span className="text-white">{savings.weekly} {fromToken}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Monthly:</span>
            <span className="text-white">{savings.monthly} {fromToken}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-white font-medium">Yearly:</span>
            <span className="text-green-400 font-medium">{savings.yearly} {fromToken}</span>
          </div>
          
          {/* Show in USD value */}
          <div className="flex justify-between pt-2 mt-2 border-t border-gray-700">
            <span className="text-gray-400">Est. value (USD):</span>
            <div className="flex items-center text-green-400">
              <FiDollarSign className="mr-0.5" size={10} />
              <span>{savings.usdValue}</span>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default SavingsVisualizerV2; 