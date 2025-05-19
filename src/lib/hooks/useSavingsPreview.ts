import { useState, useEffect, useCallback } from 'react';
import { SupportedTokenSymbol } from '../uniswap/tokens';
import { calculateSavingsAmount } from '../utils/savingsCalculator';
import { SpendSaveStrategy } from './useSpendSaveStrategy';

interface SavingsPreviewResult {
  rawAmount: string;
  formattedAmount: string;
  percentage: number;
  isEnabled: boolean;
}

/**
 * Custom hook to calculate savings preview based on swap parameters and user strategy
 */
export default function useSavingsPreview(
  inputAmount: string,
  fromToken: SupportedTokenSymbol | null,
  strategy: SpendSaveStrategy,
  overridePercentage: number | null = null,
  disableSavings: boolean = false
): SavingsPreviewResult {
  const [preview, setPreview] = useState<SavingsPreviewResult>({
    rawAmount: '0',
    formattedAmount: '0',
    percentage: 0,
    isEnabled: false
  });

  // Calculate savings preview whenever input parameters change
  useEffect(() => {
    if (!inputAmount || !fromToken || !strategy) {
      setPreview({
        rawAmount: '0',
        formattedAmount: '0',
        percentage: 0,
        isEnabled: false
      });
      return;
    }

    try {
      // Skip calculation if savings are disabled
      if (disableSavings) {
        setPreview({
          rawAmount: '0',
          formattedAmount: '0',
          percentage: 0,
          isEnabled: false
        });
        return;
      }

      // Get savings amount
      const savingsAmount = calculateSavingsAmount(
        inputAmount,
        strategy,
        overridePercentage,
        disableSavings
      );

      // Determine effective percentage (either override or from strategy)
      const effectivePercentage = overridePercentage !== null
        ? overridePercentage
        : strategy.currentPercentage / 100; // Convert basis points to percentage

      setPreview({
        rawAmount: savingsAmount,
        formattedAmount: parseFloat(savingsAmount).toFixed(6),
        percentage: effectivePercentage,
        isEnabled: strategy.isConfigured && !disableSavings
      });
    } catch (error) {
      console.error('Error calculating savings preview:', error);
      setPreview({
        rawAmount: '0',
        formattedAmount: '0',
        percentage: 0,
        isEnabled: false
      });
    }
  }, [inputAmount, fromToken, strategy, overridePercentage, disableSavings]);

  return preview;
}
