import { useState, useEffect } from 'react';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { parseUnits, formatUnits } from 'viem';

interface GasEstimation {
  gasInWei: bigint;
  gasInEth: string;
  isLoading: boolean;
}

/**
 * Hook to estimate gas for operations with SpendSave functionality
 */
export default function useGasEstimation(
  operationType: 'swap' | 'withdraw' | 'dca',
  strategy: SpendSaveStrategy,
  overridePercentage: number | null = null,
  disableSavings: boolean = false
): GasEstimation {
  const [estimation, setEstimation] = useState<GasEstimation>({
    gasInWei: BigInt(0),
    gasInEth: '0',
    isLoading: true
  });

  useEffect(() => {
    // In a real implementation, this would call estimateGas from a contract
    // Here we provide a realistic estimate based on operation type and configuration
    
    // Base gas costs for operations
    const baseGasCosts = {
      swap: BigInt(100000),   // Basic swap
      withdraw: BigInt(70000), // Withdraw operation
      dca: BigInt(120000)      // DCA operation
    };
    
    // Calculate total gas cost
    let totalGas = baseGasCosts[operationType];
    
    if (!disableSavings && strategy.isConfigured) {
      // Add gas for savings processing
      switch (strategy.savingsTokenType) {
        case 0: // INPUT
          totalGas += BigInt(30000);
          break;
        case 1: // OUTPUT
          totalGas += BigInt(40000);
          break;
        case 2: // SPECIFIC
          totalGas += BigInt(60000); // Higher gas for specific token (potential extra swap)
          break;
      }
      
      // Add gas for DCA if enabled
      if (strategy.enableDCA) {
        totalGas += BigInt(50000);
      }
    }
    
    // Current gas price estimation (in real implementation, would come from provider)
    const estimatedGasPrice = BigInt(20000000000); // 20 gwei
    
    // Calculate total gas cost in wei
    const gasInWei = totalGas * estimatedGasPrice;
    
    // Convert to ETH for display
    const gasInEth = formatUnits(gasInWei, 18);
    
    setEstimation({
      gasInWei,
      gasInEth,
      isLoading: false
    });
  }, [operationType, strategy, disableSavings, overridePercentage]);

  return estimation;
} 