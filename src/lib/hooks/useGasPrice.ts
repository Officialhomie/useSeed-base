import { useState, useEffect, useCallback } from 'react';
import { getGasPrices, estimateTransactionFee, GasPriceData, FeeEstimate } from '../gas/baseScanGasOracle';

export type GasPriceCategory = 'safe' | 'standard' | 'fast';

interface UseGasPriceOptions {
  autoFetch?: boolean;
  defaultCategory?: GasPriceCategory;
  autoEstimate?: boolean;
  gasLimit?: number;
  refreshInterval?: number | null;
}

interface UseGasPriceReturn {
  gasPrices: GasPriceData | null;
  feeEstimate: FeeEstimate | null;
  selectedCategory: GasPriceCategory;
  isLoading: boolean;
  error: Error | null;
  setSelectedCategory: (category: GasPriceCategory) => void;
  setGasLimit: (limit: number) => void;
  refetch: () => Promise<GasPriceData | void>;
  estimateFee: (gasLimit: number, category?: GasPriceCategory) => Promise<FeeEstimate>;
}

/**
 * React hook for accessing gas price data and estimating transaction fees
 */
export function useGasPrice(options: UseGasPriceOptions = {}): UseGasPriceReturn {
  const {
    autoFetch = true,
    defaultCategory = 'standard',
    autoEstimate = true,
    gasLimit = 21000,
    refreshInterval = null
  } = options;

  const [gasPrices, setGasPrices] = useState<GasPriceData | null>(null);
  const [feeEstimate, setFeeEstimate] = useState<FeeEstimate | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<GasPriceCategory>(defaultCategory);
  const [currentGasLimit, setGasLimit] = useState<number>(gasLimit);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<Error | null>(null);

  // Fetch gas prices
  const fetchGasPrices = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const prices = await getGasPrices();
      setGasPrices(prices);
      return prices;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to fetch gas prices');
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Estimate transaction fee
  const estimateFee = useCallback(async (
    gasLimit: number, 
    category: GasPriceCategory = selectedCategory
  ): Promise<FeeEstimate> => {
    try {
      const estimate = await estimateTransactionFee(gasLimit, category);
      setFeeEstimate(estimate);
      return estimate;
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Failed to estimate fee');
      setError(error);
      throw error;
    }
  }, [selectedCategory]);

  // Refetch gas prices and optionally update fee estimate
  const refetch = useCallback(async (): Promise<GasPriceData | void> => {
    try {
      const prices = await fetchGasPrices();
      
      if (autoEstimate) {
        await estimateFee(currentGasLimit, selectedCategory);
      }
      
      return prices;
    } catch (error) {
      console.error('Error fetching gas prices:', error);
    }
  }, [fetchGasPrices, autoEstimate, currentGasLimit, selectedCategory, estimateFee]);

  // Initial fetch
  useEffect(() => {
    if (autoFetch) {
      refetch().catch(console.error);
    }
  }, [autoFetch, refetch]);

  // Update fee estimate when gas limit or category changes
  useEffect(() => {
    if (gasPrices && autoEstimate) {
      estimateFee(currentGasLimit, selectedCategory).catch(console.error);
    }
  }, [gasPrices, autoEstimate, currentGasLimit, selectedCategory, estimateFee]);

  // Set up refresh interval if specified
  useEffect(() => {
    if (!refreshInterval) return;
    
    const intervalId = setInterval(() => {
      refetch().catch(console.error);
    }, refreshInterval);
    
    return () => clearInterval(intervalId);
  }, [refreshInterval, refetch]);

  return {
    gasPrices,
    feeEstimate,
    selectedCategory,
    isLoading,
    error,
    setSelectedCategory,
    setGasLimit,
    refetch,
    estimateFee
  };
} 