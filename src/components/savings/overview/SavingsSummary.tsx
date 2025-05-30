import React, { useCallback } from 'react';
import { Address } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { formatUnits } from 'viem';
import { useAccount, useReadContract } from 'wagmi';
import Link from 'next/link';

interface SavingsSummaryProps {
  fromToken: string;
  fromAmount: string;
  toToken: string;
  toAmount: string;
  getActualSwapAmount: () => string;
  calculateSavingsAmount: () => string;
}

const SavingsSummary: React.FC<SavingsSummaryProps> = ({
  fromToken,
  fromAmount,
  toToken,
  toAmount,
  getActualSwapAmount,
  calculateSavingsAmount
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

  const { data: treasuryFeeData } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'treasuryFee',
        type: 'function',
        stateMutability: 'view',
        inputs: [],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'treasuryFee',
  });
  
  // Format total saved
  const totalSaved = totalSavedData ? formatUnits(totalSavedData, 18) : '0';
  
  // Get goal amount
  const goalAmount = savingsGoalData && savingsGoalData[0] ? 
    formatUnits(savingsGoalData[0], 18) : '1.0';
    
  // Calculate goal progress
  const goalTokenAddress = savingsGoalData && savingsGoalData[1] ? 
    savingsGoalData[1] : getTokenAddress(fromToken);
    
  const showProgress = goalTokenAddress === getTokenAddress(fromToken);
  
  const goalProgress = showProgress && totalSavedData && savingsGoalData ? 
    Math.min(100, (Number(totalSavedData) / Number(savingsGoalData[0])) * 100) : 0;
  
  const isLoading = isLoadingSaved || isLoadingGoal;

  
  
  // Get the current savings amount for this transaction
  const currentSavingsAmount = calculateSavingsAmount();
  const savingsIsActive = currentSavingsAmount && parseFloat(currentSavingsAmount) > 0;

  // Calculate treasury fee for this transaction
  const calculateTreasuryFee = useCallback(() => {
    if (!treasuryFeeData || !currentSavingsAmount) return "0";
    
    const feePercentage = Number(treasuryFeeData) / 10000; // Convert from basis points
    const savingsAmount = parseFloat(currentSavingsAmount);
    const feeAmount = savingsAmount * feePercentage;
    
    return feeAmount.toFixed(6);
  }, [treasuryFeeData, currentSavingsAmount]);


  const treasuryFee = calculateTreasuryFee();
  const netSavedAmount = currentSavingsAmount ? (parseFloat(currentSavingsAmount) - parseFloat(treasuryFee)).toFixed(6) : "0";
  
  if (isLoading) {
    return (
      <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
        <p className="text-center text-gray-400">Loading savings data...</p>
      </div>
    );
  }
  
  return (
    <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
      <h3 className="text-sm font-medium text-green-400 mb-2">Swap Successful!</h3>
      <div className="text-xs space-y-1">
        <p>
          <span className="text-gray-400">Swapped: </span>
          <span className="text-white">{getActualSwapAmount()} {fromToken} → {toAmount} {toToken}</span>
        </p>
        
        {savingsIsActive && (
          <>
            <p>
              <span className="text-gray-400">Gross Saved: </span>
              <span className="text-white">{currentSavingsAmount} {fromToken}</span>
            </p>
            
            {parseFloat(treasuryFee) > 0 && (
              <p>
                <span className="text-gray-400">Treasury Fee: </span>
                <span className="text-orange-400">-{treasuryFee} {fromToken}</span>
              </p>
            )}
            
            <p>
              <span className="text-gray-400">Net Saved: </span>
              <span className="text-green-400">{netSavedAmount} {fromToken}</span>
            </p>
          </>
        )}
        
        <div className="pt-1 text-gray-400 text-xs">
          <p>You've now saved a total of <span className="text-white">{totalSaved} {fromToken}</span></p>
          
          {/* Savings Goal Progress Bar */}
          <div className="w-full bg-gray-700 rounded-full h-1.5 my-1.5">
            <div 
              className="bg-gradient-to-r from-green-500 to-emerald-500 h-1.5 rounded-full" 
              style={{ width: `${goalProgress}%` }}
            ></div>
          </div>
          <p className="text-xs text-gray-500">{goalProgress.toFixed(1)}% towards your savings goal</p>
        </div>
        <p className="pt-1 text-green-400">
          <Link href="/app-dashboard/savings" className="underline">View your savings →</Link>
        </p>
      </div>
    </div>
  );
};

export default SavingsSummary; 