import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { FiAlertCircle, FiArrowDown, FiExternalLink } from 'react-icons/fi';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import { calculateSavingsAmount, calculateActualSwapAmount } from '@/lib/utils/savingsCalculator';
import { getSavingsTokenTypeName } from '@/lib/utils/savingsHelpers';
import { describeToken } from '@/lib/uniswap/tokens';
import { cn } from '@/lib/utils';

interface SwapConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  fromToken: string;
  toToken: string;
  fromAmount: string;
  toAmount: string;
  strategy: SpendSaveStrategy;
  overridePercentage: number | null;
  disableSavings: boolean;
  slippage: string;
  usingUniswapV4?: boolean;
  dcaEnabled?: boolean;
  dcaTargetToken?: string;
  usingFallbackGas?: boolean;
  gasEstimate?: string;
  gasPriceGwei?: string;
  gasPriceCategory?: 'safe' | 'standard' | 'fast';
  savedAmount?: string;
  actualSwapAmount?: string;
  isLoading?: boolean;
}

const SwapConfirmationModal: React.FC<SwapConfirmationModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  fromToken,
  toToken,
  fromAmount,
  toAmount,
  strategy,
  overridePercentage,
  disableSavings,
  slippage,
  usingUniswapV4 = true,
  dcaEnabled = false,
  dcaTargetToken,
  usingFallbackGas = false,
  gasEstimate = '0.001',
  gasPriceGwei,
  gasPriceCategory = 'standard',
  savedAmount,
  actualSwapAmount,
  isLoading = false
}) => {
  const { address } = useAccount();

  // Calculate savings amount
  const savingsAmount = calculateSavingsAmount(
    fromAmount,
    strategy,
    overridePercentage,
    disableSavings
  );

  // Calculate actual swap amount (rename to avoid conflict with prop)
  const calculatedSwapAmount = calculateActualSwapAmount(
    fromAmount,
    strategy,
    overridePercentage,
    disableSavings
  );

  // Calculate price impact
  const priceImpact = ((parseFloat(fromAmount) - parseFloat(toAmount)) / parseFloat(fromAmount) * 100).toFixed(2);

  const handleConfirm = async () => {
    try {
      await onConfirm();
    } catch (error) {
      console.error('Swap confirmation error:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
    >
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-6 m-4">
        <h2 className="text-xl font-bold text-white mb-4">Confirm Swap</h2>
        
        {/* Swap Details */}
        <div className="bg-gray-800/40 rounded-xl p-4 mb-4">
          <div className="flex justify-between items-center mb-4">
            <div>
              <p className="text-sm text-gray-400">From</p>
              <p className="text-lg font-medium text-white">{fromAmount} {fromToken}</p>
            </div>
          </div>
          
          <div className="flex justify-center my-2">
            <div className="bg-gray-700 rounded-full p-2">
              <FiArrowDown className="text-gray-400" />
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <div>
              <p className="text-sm text-gray-400">To</p>
              <p className="text-lg font-medium text-white">{toAmount} {toToken}</p>
            </div>
          </div>
        </div>
        
        {/* Transaction Details */}
        <div className="space-y-3 mb-6">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Rate</span>
            <span className="text-white">1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Price Impact</span>
            <span className={`${
              parseFloat(priceImpact) > 5 ? 'text-red-400' : 
              parseFloat(priceImpact) > 3 ? 'text-yellow-400' : 
              'text-green-400'
            }`}>
              {priceImpact}%
            </span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-white">{slippage}%</span>
          </div>
          
          <div className="mb-4 p-3 rounded-md bg-gray-800/50">
            <div className="text-xs text-gray-400 mb-1.5">Transaction Fee</div>
            <div className="flex justify-between items-center">
              <div className="flex items-center">
                <span className="text-white font-medium">{gasEstimate} ETH</span>
                {gasPriceGwei && (
                  <span className="text-xs text-gray-400 ml-2">
                    ({gasPriceGwei} Gwei • {gasPriceCategory})
                  </span>
                )}
              </div>
              {/* If you want to show USD equivalent, calculate it here */}
            </div>
          </div>
        </div>
        
        {/* Savings Information */}
        {strategy.isConfigured && !disableSavings && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <h3 className="text-white font-medium mb-2">Savings Information</h3>
            
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 my-2">
              <p className="text-sm text-blue-300">
                {strategy.savingsTokenType === 0 
                  ? `${overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}% of your input (${savingsAmount} ${fromToken}) will be saved.` 
                  : strategy.savingsTokenType === 1 
                    ? `${overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}% of your output will be saved after swap.`
                    : `${overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}% will be converted to ${describeToken(strategy.specificSavingsToken).symbol}.`
                }
              </p>
              
              {strategy.savingsTokenType === 0 && (
                <p className="text-sm text-white mt-1">
                  <span className="font-medium">Actual swap amount:</span> {calculatedSwapAmount} {fromToken}
                </p>
              )}
            </div>
            
            {strategy.enableDCA && dcaEnabled && dcaTargetToken && (
              <div className="bg-purple-900/20 border border-purple-800/30 rounded-lg p-3 my-2">
                <p className="text-sm text-purple-300">
                  Saved amount will be queued for conversion to {dcaTargetToken} based on your DCA settings.
                </p>
              </div>
            )}
          </div>
        )}
        
        {/* Warning for high price impact */}
        {parseFloat(priceImpact) > 5 && (
          <div className="flex items-start space-x-2 bg-red-900/20 border border-red-800/30 rounded-lg p-3 mb-4">
            <FiAlertCircle className="text-red-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-red-400">
                This trade has a high price impact. You will lose a significant amount due to slippage.
              </p>
            </div>
          </div>
        )}
        
        {/* Warning for fallback gas estimation */}
        {usingFallbackGas && (
          <div className="flex items-start space-x-2 bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-3 mb-4">
            <FiAlertCircle className="text-yellow-400 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm text-yellow-400">
                Using estimated gas limits. The transaction might fail or cost more than expected.
              </p>
            </div>
          </div>
        )}
        
        {/* Action Buttons */}
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 rounded-xl font-bold ${
              isLoading
                ? "bg-blue-600/50 text-white/50 cursor-not-allowed"
                : "bg-blue-600 hover:bg-blue-500 text-white"
            } transition-colors flex items-center justify-center`}
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Confirming...
              </>
            ) : (
              'Confirm Swap'
            )}
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default SwapConfirmationModal; 