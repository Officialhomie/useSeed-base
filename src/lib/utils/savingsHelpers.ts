import { Address } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { describeToken } from '../uniswap/tokens';

// Get token symbol from address
export function getTokenSymbolFromAddress(tokenAddress: Address): string {
  if (tokenAddress === CONTRACT_ADDRESSES.ETH) return 'ETH';
  if (tokenAddress === CONTRACT_ADDRESSES.USDC) return 'USDC';
  if (tokenAddress === CONTRACT_ADDRESSES.WETH) return 'WETH';
  // fallback: look in registry
  return describeToken(tokenAddress).symbol;
}

// Get the name of the savings token type
export function getSavingsTokenTypeName(tokenType: number, specificToken?: Address): string {
  switch (tokenType) {
    case 0:
      return 'input token';
    case 1:
      return 'output token';
    case 2:
      return specificToken ? getTokenSymbolFromAddress(specificToken) : 'specific token';
    default:
      return 'unknown type';
  }
}

// Check if savings is enabled
export function isSavingsEnabled(currentPercentage: number): boolean {
  return currentPercentage > 0;
}

// Format savings percentage for display
export function formatSavingsPercentage(percentage: number): string {
  // Convert from basis points (e.g., 1000 = 10%) to display percentage
  return `${(percentage / 100).toFixed(2)}%`;
} 