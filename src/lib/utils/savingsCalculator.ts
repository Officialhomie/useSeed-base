import { parseUnits, formatUnits } from 'viem';
import { SpendSaveStrategy } from '../hooks/useSpendSaveStrategy';

// Calculate the amount to save based on the strategy and input amount
export function calculateSavingsAmount(
  inputAmount: string,
  strategy: SpendSaveStrategy,
  overridePercentage: number | null = null,
  disableSavings: boolean = false,
  decimals: number = 18
): string {
  if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0) {
    return '0';
  }
  
  if (disableSavings) {
    return '0';
  }
  
  // Use override percentage if provided, otherwise use the strategy percentage
  const percentage = overridePercentage !== null 
    ? overridePercentage 
    : (strategy.currentPercentage / 100); // Convert basis points to percentage
  
  // Calculate the savings amount
  const amountFloat = parseFloat(inputAmount);
  const savingsAmountFloat = amountFloat * (percentage / 100);
  
  // Round up if needed
  const finalSavingsAmount = strategy.roundUpSavings 
    ? Math.ceil(savingsAmountFloat * 10**6) / 10**6 // Round up to 6 decimal places
    : savingsAmountFloat;
    
  return finalSavingsAmount.toFixed(6);
}

// Calculate the actual swap amount (after deducting savings)
export function calculateActualSwapAmount(
  inputAmount: string,
  strategy: SpendSaveStrategy,
  overridePercentage: number | null = null,
  disableSavings: boolean = false,
  decimals: number = 18
): string {
  if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0) {
    return '0';
  }
  
  if (disableSavings) {
    return inputAmount;
  }
  
  const savingsAmount = parseFloat(calculateSavingsAmount(
    inputAmount,
    strategy,
    overridePercentage,
    disableSavings,
    decimals
  ));
  
  const amountFloat = parseFloat(inputAmount);
  const actualSwapAmount = amountFloat - savingsAmount;
  
  return actualSwapAmount.toFixed(6);
}

// Calculate the output amount based on the input amount, rate, and savings
export function calculateOutputAmount(
  inputAmount: string,
  rate: number,
  strategy: SpendSaveStrategy,
  overridePercentage: number | null = null,
  disableSavings: boolean = false,
  decimals: number = 18
): string {
  if (!inputAmount || isNaN(parseFloat(inputAmount)) || parseFloat(inputAmount) <= 0 || rate <= 0) {
    return '0';
  }
  
  const actualSwapAmount = parseFloat(calculateActualSwapAmount(
    inputAmount,
    strategy,
    overridePercentage,
    disableSavings,
    decimals
  ));
  
  const outputAmount = actualSwapAmount * rate;
  return outputAmount.toFixed(6);
} 