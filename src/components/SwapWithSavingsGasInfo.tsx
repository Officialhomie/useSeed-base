import React from 'react';
import { FiAlertCircle, FiInfo } from 'react-icons/fi';

interface GasInfoProps {
  fromToken: string;
  fromAmount: string;
  gasEstimate: string;
  usingFallbackGas: boolean;
  isLoading: boolean;
}

/**
 * Component for displaying gas-related information and warnings in the UI
 */
const SwapWithSavingsGasInfo: React.FC<GasInfoProps> = ({
  fromToken,
  fromAmount,
  gasEstimate,
  usingFallbackGas,
  isLoading
}) => {
  // Convert string to number safely
  const amount = parseFloat(fromAmount || '0');
  
  // Determine transaction size category
  const isSmallTx = amount > 0 && amount < 0.01;
  const isMicroTx = amount > 0 && amount < 0.001;
  
  // Only show for ETH transactions
  if (fromToken !== 'ETH') return null;

  return (
    <div className="space-y-2 mt-3">
      {/* Gas estimate information */}
      <div className="bg-gray-800/40 rounded-lg p-2 text-xs flex items-center">
        <FiInfo className="text-gray-400 mr-2 flex-shrink-0" />
        <div>
          <span className="text-gray-300">Estimated gas fee:</span>
          {' '}
          <span className="text-white font-medium">
            {isLoading ? 'Calculating...' : `~${parseFloat(gasEstimate).toFixed(6)} ETH`}
          </span>
        </div>
      </div>
      
      {/* Fallback gas warning */}
      {usingFallbackGas && (
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-2 text-xs flex items-center">
          <FiInfo className="text-blue-400 mr-2 flex-shrink-0" />
          <span className="text-blue-300">
            Using optimized gas settings for this transaction with SpendSave features.
          </span>
        </div>
      )}
      
      {/* Very small transaction warning */}
      {isMicroTx && (
        <div className="bg-yellow-900/20 border border-yellow-800/30 rounded-lg p-2 text-xs flex items-center">
          <FiAlertCircle className="text-yellow-400 mr-2 flex-shrink-0" />
          <span className="text-yellow-300">
            Micro-transaction detected. Gas costs may be high relative to the transaction amount.
            Consider larger swaps for better efficiency.
          </span>
        </div>
      )}
      
      {/* Small transaction tip */}
      {isSmallTx && !isMicroTx && (
        <div className="bg-blue-900/20 border border-blue-800/30 rounded-lg p-2 text-xs flex items-center">
          <FiInfo className="text-blue-400 mr-2 flex-shrink-0" />
          <span className="text-blue-300">
            Small transaction detected. Gas has been optimized for your SpendSave features.
          </span>
        </div>
      )}
      
      {/* Buffer info */}
      {fromAmount && parseFloat(fromAmount) > 0 && (
        <div className="text-xs flex items-center text-gray-400 px-2">
          <FiInfo className="mr-1 text-gray-500" size={12} />
          <span>
            {isMicroTx 
              ? 'For micro-transactions, keep at least 0.0003 ETH for gas' 
              : isSmallTx 
                ? 'For small transactions, keep at least 0.0005 ETH for gas'
                : 'Keep approximately 0.001 ETH for gas fees'}
          </span>
        </div>
      )}
    </div>
  );
};

export default SwapWithSavingsGasInfo; 