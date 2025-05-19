import { useState, useEffect, useCallback, useMemo } from 'react';
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
  // Calculate preview in a useMemo to avoid triggering renders via setState in useEffect
  // This eliminates the infinite update cycle
  return useMemo(() => {
    // Default empty result
    const emptyPreview = {
      rawAmount: '0',
      formattedAmount: '0',
      percentage: 0,
      isEnabled: false
    };

    if (!inputAmount || !fromToken || !strategy || disableSavings) {
      return emptyPreview;
    }

    try {
      // Get savings amount using direct calculation
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

      return {
        rawAmount: savingsAmount,
        formattedAmount: parseFloat(savingsAmount).toFixed(6),
        percentage: effectivePercentage,
        isEnabled: strategy.isConfigured && !disableSavings
      };
    } catch (error) {
      console.error('Error calculating savings preview:', error);
      return emptyPreview;
    }
  }, [
    // Only include stable dependencies that won't change on every render
    inputAmount,
    fromToken,
    // Only relevant strategy fields, not the entire object
    strategy.isConfigured,
    strategy.currentPercentage,
    strategy.roundUpSavings,
    overridePercentage,
    disableSavings
  ]);
}
