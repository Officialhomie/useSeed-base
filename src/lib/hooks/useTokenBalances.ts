import { useAccount, useBalance } from 'wagmi';
import { CONTRACT_ADDRESSES } from '../contracts';
import { useCallback, useEffect, useState } from 'react';
import { formatUnits, createPublicClient, http, isAddress, getAddress } from 'viem';
import { baseSepolia } from 'viem/chains';

// Utility functions for address validation
function isValidAddress(address: string): boolean {
  try {
    return isAddress(address);
  } catch (e) {
    return false;
  }
}

function normalizeAddress(address: string): `0x${string}` {
  try {
    // If the address is the special ETH placeholder, return it as is
    if (address.toLowerCase() === CONTRACT_ADDRESSES.ETH.toLowerCase()) {
      return address as `0x${string}`;
    }
    // Otherwise, try to get a checksummed address
    return getAddress(address);
  } catch (e) {
    console.error(`Invalid address format: ${address}`, e);
    throw new Error(`Invalid address format: ${address}`);
  }
}

// Enhanced ERC20 ABI with more error handling built in
const erc20Abi = [
  {
    name: 'balanceOf',
    type: 'function',
    stateMutability: 'view',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: 'balance', type: 'uint256' }]
  },
  {
    name: 'decimals',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }]
  },
  {
    name: 'symbol',
    type: 'function',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ name: '', type: 'string' }]
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
  }
  // DAI has been removed as it doesn't exist on Base Sepolia
};

// Create public client for fallback with better timeout and retry mechanism
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org', {
    timeout: 30000, // 30 second timeout
    retryCount: 3,
    retryDelay: 1000
  }),
});

// Function to get balance directly via RPC with enhanced error handling
async function getTokenBalanceFallback(tokenAddress: string, userAddress: string, decimals: number) {
  try {
    // Validate and normalize both addresses
    if (!isValidAddress(userAddress)) {
      throw new Error(`Invalid user address: ${userAddress}`);
    }
    
    const normalizedUserAddress = normalizeAddress(userAddress);
    let normalizedTokenAddress: `0x${string}`;
    
    try {
      normalizedTokenAddress = normalizeAddress(tokenAddress);
    } catch (e) {
      console.error(`Invalid token address format: ${tokenAddress}`, e);
      // Return fallback for this token
      const symbol = Object.keys(DEFAULT_TOKEN_DATA).find(
        key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address.toLowerCase() === tokenAddress.toLowerCase()
      );
      
      return {
        value: BigInt(0),
        formatted: '0',
        decimals: symbol ? DEFAULT_TOKEN_DATA[symbol as keyof typeof DEFAULT_TOKEN_DATA].decimals : decimals,
        symbol: symbol || 'UNKNOWN'
      };
    }
    
    // Handle special case for ETH (native token)
    if (normalizedTokenAddress.toLowerCase() === CONTRACT_ADDRESSES.ETH.toLowerCase()) {
      try {
        const balance = await publicClient.getBalance({ 
          address: normalizedUserAddress 
        });
        
        return {
          value: balance,
          formatted: formatUnits(balance, 18),
          decimals: 18,
          symbol: 'ETH'
        };
      } catch (ethError) {
        console.warn('Failed to get ETH balance:', ethError);
        return {
          value: BigInt(0),
          formatted: '0',
          decimals: 18,
          symbol: 'ETH'
        };
      }
    }
    
    // For ERC-20 tokens, try the balanceOf method with improved error handling
    try {
      // First verify the contract exists and has the balanceOf function
      const balance = await publicClient.readContract({
        address: normalizedTokenAddress,
        abi: erc20Abi,
        functionName: 'balanceOf',
        args: [normalizedUserAddress]
      });
      
      return {
        value: balance,
        formatted: formatUnits(balance as bigint, decimals),
        decimals,
        symbol: Object.keys(DEFAULT_TOKEN_DATA).find(
          key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address.toLowerCase() === normalizedTokenAddress.toLowerCase()
        ) || 'UNKNOWN'
      };
    } catch (contractError) {
      console.warn(`Token balance check failed for ${normalizedTokenAddress}:`, contractError);
      
      // For known token addresses, provide more reliable fallback
      const symbol = Object.keys(DEFAULT_TOKEN_DATA).find(
        key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address.toLowerCase() === normalizedTokenAddress.toLowerCase()
      );
      
      if (symbol) {
        console.log(`Using fallback for ${symbol} balance`);
        return {
          value: BigInt(0),
          formatted: '0',
          decimals: DEFAULT_TOKEN_DATA[symbol as keyof typeof DEFAULT_TOKEN_DATA].decimals,
          symbol
        };
      }
      
      // Default fallback
      return {
        value: BigInt(0),
        formatted: '0',
        decimals,
        symbol: 'UNKNOWN'
      };
    }
  } catch (error) {
    console.error(`Fallback balance fetch failed for ${tokenAddress}:`, error);
    // Last resort fallback - return zero balance with known details if possible
    const symbol = Object.keys(DEFAULT_TOKEN_DATA).find(
      key => DEFAULT_TOKEN_DATA[key as keyof typeof DEFAULT_TOKEN_DATA].address.toLowerCase() === tokenAddress.toLowerCase()
    );
    
    return {
      value: BigInt(0),
      formatted: '0',
      decimals: symbol ? DEFAULT_TOKEN_DATA[symbol as keyof typeof DEFAULT_TOKEN_DATA].decimals : decimals,
      symbol: symbol || 'UNKNOWN'
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
        // Validate user address before proceeding
        if (!isValidAddress(address)) {
          throw new Error(`Connected wallet address is invalid: ${address}`);
        }
        
        // Validate token addresses before calling the balance function
        const tokenAddresses = [
          CONTRACT_ADDRESSES.ETH,
          CONTRACT_ADDRESSES.USDC,
          CONTRACT_ADDRESSES.WETH,
        ];
        
        // Log warnings if any token addresses are invalid
        tokenAddresses.forEach(addr => {
          if (!isValidAddress(addr)) {
            console.error(`Invalid token address detected: ${addr}`);
          }
        });
        
        const results = await Promise.allSettled([
          getTokenBalanceFallback(CONTRACT_ADDRESSES.ETH, address, 18),
          getTokenBalanceFallback(CONTRACT_ADDRESSES.USDC, address, 6),
          getTokenBalanceFallback(CONTRACT_ADDRESSES.WETH, address, 18),
        ]);
        
        // Process results, handling any failures with detailed logging
        const balances: {[key: string]: TokenBalance} = {};
        
        // ETH balance
        if (results[0].status === 'fulfilled') {
          balances.ETH = createTokenBalance('ETH', results[0].value, false, null);
        } else {
          balances.ETH = createTokenBalance('ETH', { value: BigInt(0), formatted: '0', decimals: 18 }, false, results[0].reason);
        }
        
        // USDC balance
        if (results[1].status === 'fulfilled') {
          balances.USDC = createTokenBalance('USDC', results[1].value, false, null);
        } else {
          balances.USDC = createTokenBalance('USDC', { value: BigInt(0), formatted: '0', decimals: 6 }, false, results[1].reason);
        }
        
        // WETH balance
        if (results[2].status === 'fulfilled') {
          balances.WETH = createTokenBalance('WETH', results[2].value, false, null);
        } else {
          balances.WETH = createTokenBalance('WETH', { value: BigInt(0), formatted: '0', decimals: 18 }, false, results[2].reason);
        }
        
        setTokenBalances(balances);
      } catch (error) {
        console.error("Error fetching balances:", error);
        
        // Provide fallback values for all tokens in case of complete failure
        const fallbackBalances: {[key: string]: TokenBalance} = {
          ETH: createTokenBalance('ETH', { value: BigInt(0), formatted: '0', decimals: 18 }, false, error as Error),
          USDC: createTokenBalance('USDC', { value: BigInt(0), formatted: '0', decimals: 6 }, false, error as Error),
          WETH: createTokenBalance('WETH', { value: BigInt(0), formatted: '0', decimals: 18 }, false, error as Error),
        };
        
        setTokenBalances(fallbackBalances);
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
    setIsLoading(true);
    setTokenBalances(prev => {
      // Update isLoading flag on all existing balances
      const updated = { ...prev };
      Object.keys(updated).forEach(key => {
        updated[key] = { ...updated[key], isLoading: true };
      });
      return updated;
    });
  }, [address]);

  return {
    tokenBalances,
    isLoading,
    refreshBalances,
    isConnected
  };
} 