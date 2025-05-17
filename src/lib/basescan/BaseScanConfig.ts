/**
 * Centralized configuration for BaseScan API
 * This file should be imported by all modules that need BaseScan configuration
 */

/**
 * The BaseScan API URL
 */
export const BASESCAN_API_URL = 'https://api.basescan.org/api';

/**
 * Configure the API key from environment variable
 * Configure this in .env or .env.local:
 * NEXT_PUBLIC_BASESCAN_API_KEY=your_api_key_here
 */
export const getBaseScanApiKey = (): string => {
  // Get the API key from the environment variable
  const apiKey = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';
  
  // Log a warning if no API key is provided
  if (!apiKey) {
    console.warn('NEXT_PUBLIC_BASESCAN_API_KEY is not set in environment variables.');
    console.warn('Asset prices will use fallbacks instead of real-time data.');
    console.warn('Get a free API key from https://basescan.org/apis');
  }
  
  return apiKey;
};

/**
 * Fallback asset prices to use when the API is unavailable
 * These values are used as a last resort
 */
export const FALLBACK_PRICES = {
  ETH: 2500,
  WETH: 2500,
  USDC: 1.00,
  USDT: 1.00,
  DAI: 1.00
}; 