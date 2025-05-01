import { useAccount } from 'wagmi';
import { useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../contracts';
import { useCallback, useEffect, useState } from 'react';
import { formatUnits } from 'viem';

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

export function useTokenBalances() {
  const { address, isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: TokenBalance}>({});
  
  // Fetch native ETH balance
  const {
    data: ethBalance,
    isLoading: isLoadingEth,
    error: ethError,
    refetch: refetchEth
  } = useBalance({
    address,
    query: {
      enabled: !!address
    }
  });

  // Fetch USDC balance
  const {
    data: usdcBalance,
    isLoading: isLoadingUsdc,
    error: usdcError,
    refetch: refetchUsdc
  } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.USDC,
    query: {
      enabled: !!address
    }
  });

  // Fetch WETH balance
  const {
    data: wethBalance,
    isLoading: isLoadingWeth,
    error: wethError,
    refetch: refetchWeth
  } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.WETH,
    query: {
      enabled: !!address
    }
  });

  // Fetch DAI balance
  const {
    data: daiBalance,
    isLoading: isLoadingDai,
    error: daiError,
    refetch: refetchDai
  } = useBalance({
    address,
    token: CONTRACT_ADDRESSES.DAI,
    query: {
      enabled: !!address
    }
  });

  // Update balances when they change
  useEffect(() => {
    if (!address) return;

    const balances: {[key: string]: TokenBalance} = {};

    // ETH
    if (ethBalance) {
      balances.ETH = {
        symbol: 'ETH',
        name: 'Ethereum',
        address: CONTRACT_ADDRESSES.ETH,
        balance: ethBalance.value.toString(),
        formattedBalance: ethBalance.formatted,
        decimals: ethBalance.decimals,
        isLoading: isLoadingEth,
        error: ethError as Error | null,
      };
    }

    // USDC
    if (usdcBalance) {
      balances.USDC = {
        symbol: 'USDC',
        name: 'USD Coin',
        address: CONTRACT_ADDRESSES.USDC,
        balance: usdcBalance.value.toString(),
        formattedBalance: usdcBalance.formatted,
        decimals: usdcBalance.decimals,
        isLoading: isLoadingUsdc,
        error: usdcError as Error | null,
      };
    }

    // WETH
    if (wethBalance) {
      balances.WETH = {
        symbol: 'WETH',
        name: 'Wrapped Ether',
        address: CONTRACT_ADDRESSES.WETH,
        balance: wethBalance.value.toString(),
        formattedBalance: wethBalance.formatted,
        decimals: wethBalance.decimals,
        isLoading: isLoadingWeth,
        error: wethError as Error | null,
      };
    }

    // DAI
    if (daiBalance) {
      balances.DAI = {
        symbol: 'DAI',
        name: 'Dai Stablecoin',
        address: CONTRACT_ADDRESSES.DAI,
        balance: daiBalance.value.toString(),
        formattedBalance: daiBalance.formatted,
        decimals: daiBalance.decimals,
        isLoading: isLoadingDai,
        error: daiError as Error | null,
      };
    }

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

  // Return loading state if any token is still loading
  const isLoading = isLoadingEth || isLoadingUsdc || isLoadingWeth || isLoadingDai;

  return {
    tokenBalances,
    isLoading,
    refreshBalances,
    isConnected
  };
} 