import { useAccount, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../contracts';
import { useCallback, useEffect, useState } from 'react';
import { formatUnits, Address } from 'viem';

export interface TokenBalance {
  symbol: string;
  name: string;
  address: string;
  balance: string;
  formattedBalance: string;
  decimals: number;
  isLoading: boolean;
  error: Error | null;
}

// Default token data
const DEFAULT_TOKEN_DATA = {
  ETH: {
    symbol: 'ETH',
    name: 'Ethereum',
    address: CONTRACT_ADDRESSES.ETH,
    decimals: 18
  },
  USDC: {
    symbol: 'USDC',
    name: 'USD Coin',
    address: CONTRACT_ADDRESSES.USDC,
    decimals: 6
  },
  WETH: {
    symbol: 'WETH',
    name: 'Wrapped Ether',
    address: CONTRACT_ADDRESSES.WETH,
    decimals: 18
  },
  DAI: {
    symbol: 'DAI',
    name: 'Dai Stablecoin',
    address: CONTRACT_ADDRESSES.DAI,
    decimals: 18
  }
};

export function useTokenBalances() {
  const { address, isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: TokenBalance}>({});
  
  // Fetch native ETH balance with error handling
  const {
    data: ethBalance,
    isLoading: isLoadingEth,
    error: ethError,
    refetch: refetchEth
  } = useBalance({
    address,
    query: {
      enabled: !!address,
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false
    }
  });

  // Fetch USDC balance with error handling
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: usdcError,
    refetch: refetchUsdc
  } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.USDC,
    query: {
      enabled: !!address,
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false
    }
  });

  // Fetch WETH balance with error handling
  const {
    data: wethBalance,
    isLoading: isLoadingWeth,
    error: wethError,
    refetch: refetchWeth
  } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.WETH,
    query: {
      enabled: !!address,
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false
    }
  });

  // Fetch DAI balance with error handling
  const {
    data: daiBalance,
    isLoading: isLoadingDai,
    error: daiError,
    refetch: refetchDai
  } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.DAI,
    query: {
      enabled: !!address,
      retry: 1,
      staleTime: 15000,
      refetchOnWindowFocus: false
    }
  });

  // Create a token balance object
  const createTokenBalance = (
    symbol: keyof typeof DEFAULT_TOKEN_DATA,
    balance: any,
    isLoading: boolean,
    error: any
  ): TokenBalance => {
    const defaultData = DEFAULT_TOKEN_DATA[symbol];
    
    return {
      symbol,
      name: defaultData.name,
      address: defaultData.address,
      balance: balance?.value?.toString() || '0',
      formattedBalance: balance?.formatted || '0',
      decimals: balance?.decimals || defaultData.decimals,
      isLoading,
      error: error as Error | null
    };
  };

  // Update balances when they change
  useEffect(() => {
    if (!address) return;

    const balances: {[key: string]: TokenBalance} = {
      ETH: createTokenBalance('ETH', ethBalance, isLoadingEth, ethError),
      USDC: createTokenBalance('USDC', usdcBalance, isLoadingUsdc, usdcError),
      WETH: createTokenBalance('WETH', wethBalance, isLoadingWeth, wethError),
      DAI: createTokenBalance('DAI', daiBalance, isLoadingDai, daiError)
    };

    setTokenBalances(balances);
  }, [
    address, 
    ethBalance, isLoadingEth, ethError,
    usdcBalance, isLoadingUsdc, usdcError,
    wethBalance, isLoadingWeth, wethError,
    daiBalance, isLoadingDai, daiError
  ]);

  // Refresh all balances
  const refreshBalances = useCallback(() => {
    if (!address) return;
    
    refetchEth();
    refetchUsdc();
    refetchWeth();
    refetchDai();
  }, [address, refetchEth, refetchUsdc, refetchWeth, refetchDai]);

  // Return loading state if any token is still loading and doesn't have error
  // Don't block the whole UI just because one token is having issues
  const isLoading = (isLoadingEth && !ethError) || 
                   (isLoadingUsdc && !usdcError) || 
                   (isLoadingWeth && !wethError) || 
                   (isLoadingDai && !daiError);

  return {
    tokenBalances,
    isLoading,
    refreshBalances,
    isConnected
  };
} 