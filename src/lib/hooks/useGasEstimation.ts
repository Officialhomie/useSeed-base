import { useState, useEffect } from 'react';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { calculateV4SwapGasLimit } from '../uniswap/UniswapV4Integration';

/**
 * Hook to estimate gas for various operations
 */
export default function useGasEstimation(
  operationType: 'swap' | 'deposit' | 'withdraw',
  strategy?: SpendSaveStrategy,
  overridePercentage?: number | null,
  disableSavings?: boolean
) {
  const [gasInEth, setGasInEth] = useState('0.001');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const estimateGas = async () => {
      setIsLoading(true);
      
      try {
        // For swap operations, use our V4 gas estimation logic
        if (operationType === 'swap' && strategy) {
          const { gasLimit } = calculateV4SwapGasLimit({
            fromToken: 'ETH', // Assume ETH as base for estimates
            toToken: 'USDC',  // Default target
            value: 0.01,      // Default estimate amount
            savingsTokenType: strategy.savingsTokenType,
            enableDCA: strategy.enableDCA,
            disableSavings: disableSavings || false
          });
          
          // Calculate gas in ETH (assuming 30 gwei gas price)
          const gasPrice = BigInt(30) * BigInt(1000000000); // 30 gwei
          const gasEstimateWei = gasLimit * gasPrice;
          const gasEstimateEth = (Number(gasEstimateWei) / 1e18).toFixed(6);
          
          setGasInEth(gasEstimateEth);
        } else {
          // Default gas estimates for other operations
          setGasInEth(operationType === 'deposit' ? '0.0008' : '0.0012');
        }
      } catch (error) {
        console.warn('Gas estimation error:', error);
        // Fallback values
        setGasInEth(operationType === 'swap' ? '0.001' : 
                   operationType === 'deposit' ? '0.0008' : '0.0012');
      } finally {
        setIsLoading(false);
      }
    };
    
    estimateGas();
  }, [operationType, strategy, overridePercentage, disableSavings]);
  
  return { gasInEth, isLoading };
} 