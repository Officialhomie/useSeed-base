import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import { calculateSavingsAmount, calculateActualSwapAmount } from '@/lib/utils/savingsCalculator';
import { FiAlertCircle, FiArrowDown, FiExternalLink } from 'react-icons/fi';

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
  gasEstimate = "0.0012 ETH"
}) => {
  const [isLoading, setIsLoading] = useState(false);

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
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">Confirm Swap</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>

        {/* Swap Details */}
        <div className="bg-gray-800/60 rounded-xl p-4 mb-4">
          <div className="flex flex-col items-center">
            <div className="bg-gray-700/50 p-3 rounded-lg w-full text-center">
              <div className="text-sm text-gray-400">You pay</div>
              <div className="text-xl font-semibold mt-1">{fromAmount} {fromToken}</div>
            </div>
            
            <div className="my-2">
              <div className="bg-gray-800 rounded-full p-2">
                <FiArrowDown size={16} />
              </div>
            </div>
            
            <div className="bg-gray-700/50 p-3 rounded-lg w-full text-center">
              <div className="text-sm text-gray-400">You receive</div>
              <div className="text-xl font-semibold mt-1">{toAmount} {toToken}</div>
            </div>
          </div>
        </div>

        {/* Savings Information */}
        {strategy.isConfigured && !disableSavings && parseFloat(savingsAmount) > 0 && (
          <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 mb-4">
            <h3 className="text-sm font-medium text-blue-400 mb-2">SpendSave Savings</h3>
            <div className="text-sm space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Saving:</span>
                <span className="text-white">{savingsAmount} {fromToken}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Actual swap amount:</span>
                <span className="text-white">{actualSwapAmount} {fromToken}</span>
              </div>
              
              {/* Display savings percentage */}
              <div className="flex justify-between">
                <span className="text-gray-400">Savings rate:</span>
                <span className="text-blue-400">
                  {(parseFloat(savingsAmount) / parseFloat(fromAmount) * 100).toFixed(2)}% of swap
                </span>
              </div>
              
              {strategy.enableDCA && (
                <div className="flex justify-between pt-2 mt-1 border-t border-blue-800/30">
                  <span className="text-gray-400">DCA Queue:</span>
                  <span className="text-blue-300">
                    Will be added to DCA queue
                    <FiArrowDown className="inline ml-1" />
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Transaction Details */}
        <div className="space-y-2 text-sm mb-6">
          <div className="flex justify-between">
            <span className="text-gray-400">Rate</span>
            <span className="text-white">1 {fromToken} = {(parseFloat(toAmount) / parseFloat(actualSwapAmount)).toFixed(6)} {toToken}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Price Impact</span>
            <span className={`${parseFloat(priceImpact) > 1 ? 'text-yellow-400' : 'text-green-400'}`}>{priceImpact}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Max Slippage</span>
            <span className="text-white">{slippage}%</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Estimated Gas</span>
            <span className="text-white">{gasEstimate}</span>
          </div>
        </div>

        {/* Swap Button */}
        <button
          onClick={handleConfirm}
          disabled={isLoading}
          className={`w-full py-3 rounded-xl font-bold ${
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
      </motion.div>
    </div>
  );
};

export default SwapConfirmationModal; 