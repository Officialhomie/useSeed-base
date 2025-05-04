import { useAccount, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../contracts';
import { useCallback, useEffect, useState } from 'react';
import { formatUnits, createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// Standard ERC20 ABI for balanceOf - only this one should be used for external tokens
const erc20BalanceOfAbi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  }
];

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

// Create public client for fallback
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http(),
});

// Function to get balance directly via RPC
async function getTokenBalanceFallback(tokenAddress: string, userAddress: string, decimals: number) {
  try {
    // For ETH, use getBalance
    if (tokenAddress === CONTRACT_ADDRESSES.ETH) {
      const balance = await publicClient.getBalance({ address: userAddress as `0x${string}` });
      return {
        value: balance,
        formatted: formatUnits(balance, 18),
        decimals: 18,
        symbol: 'ETH'
      };
    }
    
    // For ERC-20 tokens, try to directly access each token contract (not the hook)
    try {
      const balance = await publicClient.readContract({
        address: tokenAddress as `0x${string}`,
        abi: erc20BalanceOfAbi,
        functionName: 'balanceOf',
        args: [userAddress as `0x${string}`]
      });
      
      return {
        value: balance,
        formatted: formatUnits(balance as bigint, decimals),
        decimals,
        symbol: Object.keys(DEFAULT_TOKEN_DATA).find(
          key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address === tokenAddress
        ) || 'UNKNOWN'
      };
    } catch (contractError) {
      // If contract call fails, return zero balance
      console.log(`External token not found or doesn't support standard balanceOf: ${tokenAddress}`);
      return {
        value: BigInt(0),
        formatted: '0',
        decimals,
        symbol: Object.keys(DEFAULT_TOKEN_DATA).find(
          key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address === tokenAddress
        ) || 'UNKNOWN'
      };
    }
  } catch (error) {
    console.error(`Fallback balance fetch failed for ${tokenAddress}:`, error);
    return {
      value: BigInt(0),
      formatted: '0',
      decimals,
      symbol: Object.keys(DEFAULT_TOKEN_DATA).find(
        key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address === tokenAddress
      ) || 'UNKNOWN'
    };
  }
}

export function useTokenBalances() {
  const { address, isConnected } = useAccount();
  const [tokenBalances, setTokenBalances] = useState<{[key: string]: TokenBalance}>({});
  const [isLoading, setIsLoading] = useState(false);
  
  // Fetch all balances using the direct RPC method
  useEffect(() => {
    if (!address) return;
    
    const fetchBalances = async () => {
      setIsLoading(true);
      
      try {
        const results = await Promise.all([
          getTokenBalanceFallback(CONTRACT_ADDRESSES.ETH, address, 18),
          getTokenBalanceFallback(CONTRACT_ADDRESSES.USDC, address, 6),
          getTokenBalanceFallback(CONTRACT_ADDRESSES.WETH, address, 18),
          getTokenBalanceFallback(CONTRACT_ADDRESSES.DAI, address, 18)
        ]);
        
        const [ethBalance, usdcBalance, wethBalance, daiBalance] = results;
        
        const balances: {[key: string]: TokenBalance} = {
          ETH: createTokenBalance('ETH', ethBalance, false, null),
          USDC: createTokenBalance('USDC', usdcBalance, false, null),
          WETH: createTokenBalance('WETH', wethBalance, false, null),
          DAI: createTokenBalance('DAI', daiBalance, false, null),
        };
        
        setTokenBalances(balances);
      } catch (error) {
        console.error("Error fetching balances:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchBalances();
  }, [address]);

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

  // Refresh all balances
  const refreshBalances = useCallback(() => {
    if (!address) return;
    
    // Force a re-render that will trigger the useEffect
    setTokenBalances({});
  }, [address]);

  return {
    tokenBalances,
    isLoading,
    refreshBalances,
    isConnected
  };
} 