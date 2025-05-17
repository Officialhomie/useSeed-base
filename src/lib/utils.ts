import { ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

/**
 * A utility function for conditionally joining CSS class names together.
 * Combines clsx and tailwind-merge for clean class composition.
 * 
 * @param inputs - CSS class names or conditions
 * @returns Merged class string
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Format a raw value with decimal places and optional symbol
 * @param value Value to format
 * @param decimals Number of decimal places
 * @param symbol Optional symbol to append (e.g. "$")
 * @returns Formatted string value
 */
export function formatValue(
  value: number | string | undefined | null,
  decimals: number = 2,
  symbol: string = ''
): string {
  if (value === undefined || value === null || value === '') {
    return symbol ? `${symbol}0` : '0';
  }

  // Convert string to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  
  // Check for NaN
  if (isNaN(numValue)) {
    return symbol ? `${symbol}0` : '0';
  }

  // Format the number
  const formattedValue = numValue.toFixed(decimals);
  return symbol ? `${symbol}${formattedValue}` : formattedValue;
}

/**
 * Truncate an Ethereum address
 * @param address Full address
 * @param startLength Number of characters to show at start
 * @param endLength Number of characters to show at end
 * @returns Truncated address with ellipsis
 */
export function truncateAddress(
  address: string | undefined,
  startLength: number = 6,
  endLength: number = 4
): string {
  if (!address) return '';
  if (address.length <= startLength + endLength) return address;
  
  return `${address.slice(0, startLength)}...${address.slice(-endLength)}`;
} 