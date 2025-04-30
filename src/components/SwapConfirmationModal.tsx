import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useAccount } from 'wagmi';
import { FiAlertCircle, FiArrowDown, FiExternalLink } from 'react-icons/fi';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import { calculateSavingsAmount, calculateActualSwapAmount } from '@/lib/utils/savingsCalculator';
import { getSavingsTokenTypeName, getTokenSymbolFromAddress } from '@/lib/utils/savingsHelpers';

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
  priceImpact?: string;
  gasEstimate?: string;
  usingUniswapV4?: boolean;
  dcaEnabled?: boolean;
  dcaTargetToken?: string;
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
  priceImpact = "0.01",
  gasEstimate = "0.0012 ETH",
  usingUniswapV4 = true,
  dcaEnabled = false,
  dcaTargetToken
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const { address } = useAccount();

  // Calculate savings amount
  const savingsAmount = calculateSavingsAmount(
    fromAmount,
    strategy,
    overridePercentage,
    disableSavings
  );

  // Calculate actual swap amount
  const actualSwapAmount = calculateActualSwapAmount(
    fromAmount,
    strategy,
    overridePercentage,
    disableSavings
  );

  const handleConfirm = () => {
    setIsLoading(true);
    // In a real implementation, you would wait for the transaction to be mined
    setTimeout(() => {
      onConfirm();
      setIsLoading(false);
    }, 1000);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md mx-4"
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-semibold">Confirm Swap</h2>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white"
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">From</span>
            <span className="text-white font-medium">{fromAmount} {fromToken}</span>
          </div>
          
          <div className="flex justify-center my-2">
            <div className="bg-gray-700 rounded-full p-1">
              <FiArrowDown className="text-white" />
            </div>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">To</span>
            <span className="text-white font-medium">{toAmount} {toToken}</span>
          </div>

          {/* Price impact warning */}
          {parseFloat(priceImpact) > 5 && (
            <div className="mt-3 flex items-center text-yellow-500 text-sm">
              <FiAlertCircle className="mr-1" />
              <span>High price impact: {priceImpact}%</span>
            </div>
          )}
        </div>

        {/* Savings information */}
        {strategy.isConfigured && !disableSavings && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <h3 className="text-white font-medium mb-2">Savings Information</h3>
            
            <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-3 my-2">
              <p className="text-sm text-blue-300">
                {strategy.savingsTokenType === 0 
                  ? `${overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}% of your input (${savingsAmount} ${fromToken}) will be saved.` 
                  : strategy.savingsTokenType === 1 
                    ? `${overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}% of your output will be saved after swap.`
                    : `${overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}% will be converted to ${getSavingsTokenTypeName(strategy.savingsTokenType, strategy.specificSavingsToken)}.`
                }
              </p>
              
              {strategy.savingsTokenType === 0 && (
                <p className="text-sm text-white mt-1">
                  <span className="font-medium">Actual swap amount:</span> {actualSwapAmount} {fromToken}
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

        {/* Uniswap v4 information */}
        {usingUniswapV4 && (
          <div className="mt-4 border-t border-gray-800 pt-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-400 text-sm">Routing via</span>
              <div className="flex items-center">
                <img src="/uniswap-v4-logo.png" alt="Uniswap v4" className="h-4 w-4 mr-1" />
                <span className="text-white text-sm">Uniswap v4</span>
              </div>
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-gray-400 text-sm">Hook</span>
              <span className="text-white text-sm font-mono text-xs">SpendSaveHook</span>
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="mb-6">
          <div className="flex justify-between mb-2">
            <span className="text-gray-400">Price</span>
            <span className="text-white">1 {fromToken} = {(parseFloat(toAmount) / parseFloat(fromAmount)).toFixed(6)} {toToken}</span>
          </div>
          
          <div className="flex justify-between">
            <span className="text-gray-400">Slippage Tolerance</span>
            <span className="text-white">{slippage}%</span>
          </div>
        </div>

        <div className="mt-4 border-t border-gray-800 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-400 text-sm">Gas estimate</span>
            <span className="text-white">{gasEstimate}</span>
          </div>
        </div>

        <div className="flex space-x-3 mt-6">
          <button
            onClick={onClose}
            className="flex-1 py-3 rounded-xl font-bold bg-gray-800 hover:bg-gray-700 text-white transition-colors"
          >
            Cancel
          </button>
          
          <button
            onClick={handleConfirm}
            disabled={isLoading}
            className={`flex-1 py-3 rounded-xl font-bold ${
              isLoading ? "bg-gray-700 text-gray-400 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-500 text-white"
            } transition-colors flex justify-center items-center`}
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
      </motion.div>
    </div>
  );
};

export default SwapConfirmationModal; 