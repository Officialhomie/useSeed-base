import React from 'react';
import { FiArrowUp, FiPieChart, FiTrendingUp, FiDollarSign } from 'react-icons/fi';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import { calculateSavingsAmount } from '@/lib/utils/savingsCalculator';

interface SavingsCalculatorProps {
  fromAmount: string;
  fromToken: string;
  tokenPrice: number;
  strategy: SpendSaveStrategy;
  overridePercentage: number | null;
  disableSavings: boolean;
  totalSaved: string;
  savingsGoalProgress: number;
}

const SavingsCalculator: React.FC<SavingsCalculatorProps> = ({
  fromAmount,
  fromToken,
  tokenPrice,
  strategy,
  overridePercentage,
  disableSavings,
  totalSaved,
  savingsGoalProgress
}) => {
  // Calculate savings for different timeframes
  const calculateSavings = () => {
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
  
  const savings = calculateSavings();
  
  return (
    <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4">
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
        
        {/* Progress Bar */}
        <div className="w-full bg-gray-700 rounded-full h-2.5">
          <div 
            className="bg-gradient-to-r from-blue-500 to-green-500 h-2.5 rounded-full transition-all duration-500 ease-in-out" 
            style={{ width: `${savingsGoalProgress}%` }}
          ></div>
        </div>
        <div className="flex justify-between text-xs mt-1">
          <span className="text-gray-500">0 {fromToken}</span>
          <span className="text-gray-500">Goal: 1 {fromToken}</span>
        </div>
      </div>
      
      {/* Savings Breakdown */}
      <div className="bg-gray-800/40 rounded-lg p-3 text-xs">
        <h4 className="text-gray-300 font-medium mb-2 flex items-center">
          <FiTrendingUp className="mr-1.5 text-blue-400" />
          Projected Savings (assuming regular swaps)
        </h4>
        <div className="space-y-1.5">
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
          <div className="flex justify-between pt-1.5 mt-1.5 border-t border-gray-700">
            <span className="text-gray-400">Est. value (USD):</span>
            <div className="flex items-center text-green-400">
              <FiDollarSign className="mr-0.5" size={10} />
              <span>{savings.usdValue}</span>
            </div>
          </div>
        </div>
      </div>
      
      {/* Compound Effect - Advanced calculation could go here */}
      <div className="mt-3 bg-gray-800/40 rounded-lg p-3 text-xs">
        <h4 className="text-gray-300 font-medium mb-2 flex items-center">
          <FiArrowUp className="mr-1.5 text-purple-400" />
          Compound Growth Potential
        </h4>
        <p className="text-gray-400">
          If your {savings.yearly} {fromToken} annual savings were to earn 5% APY, 
          after 5 years you could have approximately {(parseFloat(savings.yearly) * 5.53).toFixed(6)} {fromToken}.
        </p>
      </div>
    </div>
  );
};

export default SavingsCalculator; 