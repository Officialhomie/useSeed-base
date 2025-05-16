import { useState, useEffect } from 'react';
import { SupportedTokenSymbol } from '../uniswap/tokens';
import { useUniswapClient } from './useUniswapClient';

export interface TokenPrice {
  price: number;
  status: 'loading' | 'success' | 'fallback' | 'error' | 'stable';
}

export interface TokenPricesData {
  prices: Record<SupportedTokenSymbol, TokenPrice>;
  apiStatus: {
    isOperational: boolean;
    lastUpdated: Date;
    fallbackUsed: boolean;
  };
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

/**
 * Hook to fetch and periodically update token prices using the UniswapV4Client
 * @param refreshInterval Time in ms between auto-refresh (default: 60000ms = 1 minute)
 */
export function useTokenPrices(refreshInterval = 60000): TokenPricesData {
  const [data, setData] = useState<Omit<TokenPricesData, 'refetch'>>({
    prices: {
      ETH: { price: 0, status: 'loading' },
      WETH: { price: 0, status: 'loading' },
      USDC: { price: 1, status: 'stable' },
      DAI: { price: 1, status: 'stable' },
    },
    apiStatus: {
      isOperational: true,
      lastUpdated: new Date(),
      fallbackUsed: false,
    },
    isLoading: true,
    error: null,
  });

  const { client } = useUniswapClient();

  const fetchPrices = async () => {
    if (!client) return;

    try {
      setData(prev => ({ ...prev, isLoading: true }));
      const pricesData = await client.getTokenPrices();
      
      setData({
        prices: pricesData.prices,
        apiStatus: pricesData.apiStatus,
        isLoading: false,
        error: null,
      });
    } catch (error) {
      console.error('Error fetching token prices:', error);
      setData(prev => ({
        ...prev,
        isLoading: false,
        error: error instanceof Error ? error : new Error('Unknown error fetching prices'),
      }));
    }
  };

  // Initial fetch
  useEffect(() => {
    fetchPrices();
  }, [client]);

  // Set up interval for refreshing
  useEffect(() => {
    // Skip if refresh interval is 0 or negative
    if (refreshInterval <= 0) return;

    const intervalId = setInterval(fetchPrices, refreshInterval);
    return () => clearInterval(intervalId);
  }, [client, refreshInterval]);

  return {
    ...data,
    refetch: fetchPrices,
  };
} 