import { parseUnits, formatUnits } from 'viem';
import { SpendSaveStrategy } from '../hooks/useSpendSaveStrategy';

// Calculate the amount to save based on the strategy and input amount
// ✅ ENHANCE: calculateSavingsAmount with validation
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
  
  const percentage = overridePercentage !== null 
    ? overridePercentage 
    : (strategy.currentPercentage / 100);
    
  if (percentage < 0.01 || percentage > 50) {
    console.warn(`Invalid savings percentage: ${percentage}%. Using fallback.`);
    return '0';
  }
  
  const amountFloat = parseFloat(inputAmount);
  const savingsAmountFloat = amountFloat * (percentage / 100);
  
  if (savingsAmountFloat > amountFloat * 0.5) {
    console.warn(`Savings amount (${savingsAmountFloat}) exceeds 50% of input. Capping at 50%.`);
    return (amountFloat * 0.5).toFixed(6);
  }
  
  const finalSavingsAmount = strategy.roundUpSavings 
    ? Math.ceil(savingsAmountFloat * 10**6) / 10**6
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