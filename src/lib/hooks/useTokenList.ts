import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import TokenABI from '@/ABI/Token.json';
import { SUPPORTED_TOKENS, SupportedTokenSymbol } from '../uniswap/tokens';
import { BaseScanClient } from '../basescan/BaseScanClient';

export interface Token {
  symbol: SupportedTokenSymbol;
  name: string;
  address: Address;
  decimals: number;
  balance: string;
  price: number;
  priceLoading: boolean;
}

// Create a BaseScanClient instance - no need to pass API key, it will be read from config
const baseScanClient = new BaseScanClient();

export function useTokenList() {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // For standard ERC20 tokens
  const erc20BalanceOfAbi = [
    {
      name: 'balanceOf',
      type: 'function',
      stateMutability: 'view',
      inputs: [{ name: 'account', type: 'address' }],
      outputs: [{ name: 'balance', type: 'uint256' }]
    }
  ];

  // Fetch token data with proper error handling
  const fetchTokenData = async (tokenAddress: Address, symbol: SupportedTokenSymbol) => {
    if (!publicClient || !address) {
      const tokenInfo = SUPPORTED_TOKENS[symbol];
      return {
        name: tokenInfo.name,
        symbol,
        address: tokenAddress,
        decimals: tokenInfo.decimals,
        balance: '0',
        price: 0,
        priceLoading: true
      } as Token;
    }
    
    const tokenInfo = SUPPORTED_TOKENS[symbol];
    
    // For native ETH, handle differently
    if (symbol === 'ETH') {
      try {
        const ethBalance = await publicClient.getBalance({ 
          address: address 
        });
        
        const tokenData = {
          name: tokenInfo.name,
          symbol,
          address: tokenAddress,
          decimals: tokenInfo.decimals,
          balance: formatUnits(ethBalance, tokenInfo.decimals),
          price: 0, // Will be updated by price loader
          priceLoading: true
        } as Token;
        
        // Return the token data immediately to show in UI
        return tokenData;
      } catch (error) {
        // Silently return fallback without logging error
        return {
          name: tokenInfo.name,
          symbol,
          address: tokenAddress,
          decimals: tokenInfo.decimals,
          balance: '0',
          price: 0,
          priceLoading: true
        } as Token;
      }
    }

    // Special case for USDC on Base - use fallback due to API limitations
    if (symbol === 'USDC') {
      return {
        name: tokenInfo.name,
        symbol,
        address: tokenAddress,
        decimals: tokenInfo.decimals,
        balance: '0',
        price: 0,
        priceLoading: true
      } as Token;
    }

    try {
      // Use the standard ERC20 ABI for all token contracts
      const balanceData = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20BalanceOfAbi,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      const tokenData = {
        name: tokenInfo.name,
        symbol,
        address: tokenAddress,
        decimals: tokenInfo.decimals,
        balance: formatUnits(balanceData || BigInt(0), tokenInfo.decimals),
        price: 0, // Will be updated by price loader
        priceLoading: true
      } as Token;
        
      // Return the token data immediately to show in UI
      return tokenData;
    } catch (error) {
      // Silently return fallback without logging error
      return {
        name: tokenInfo.name,
        symbol,
        address: tokenAddress,
        decimals: tokenInfo.decimals,
        balance: '0',
        price: 0,
        priceLoading: true
      } as Token;
    }
  };

  // Load token prices asynchronously
  const loadTokenPrices = async (tokenList: Token[]) => {
    const updatedTokens = [...tokenList];
    
    // Get ETH price first since we'll need it for multiple tokens
    let ethPrice = 0;
    try {
      ethPrice = await baseScanClient.getEthPrice();
    } catch (error) {
      console.warn('Failed to get ETH price:', error);
    }
    
    // Process each token and update its price
    for (let i = 0; i < updatedTokens.length; i++) {
      const token = updatedTokens[i];
      try {
        let price = 0;
        
        // For ETH, use the price we already fetched
        if (token.symbol === 'ETH') {
          price = ethPrice;
        } 
        // For WETH, also use ETH price as they're typically 1:1
        else if (token.symbol === 'WETH') {
          price = ethPrice;
        }
        // For stablecoins, use 1.00 as the default
        else if (token.symbol === 'USDC' || token.symbol === 'USDT' as any || token.symbol === 'DAI' as any) {
          price = 1.00;
        }
        // For other tokens, use getTokenPrice
        else {
          price = await baseScanClient.getTokenPrice(token.address);
        }
        
        token.price = price;
        token.priceLoading = false;
      } catch (error) {
        console.warn(`Error fetching price for ${token.symbol}:`, error);
        
        // Don't keep in loading state indefinitely
        token.priceLoading = false;
        
        // Set a default price based on the token type
        if (token.symbol === 'USDC' || token.symbol === 'USDT' as any || token.symbol === 'DAI' as any) {
          token.price = 1.00; // Stablecoins are typically $1
        } else if (token.symbol === 'WETH') {
          token.price = ethPrice || 0; // Use the ETH price we fetched earlier
        }
      }
    }
    
    // Update the state with prices if we have tokens
    if (updatedTokens.length > 0) {
      setTokens(updatedTokens);
    }
  };

  // Fetch all token data with retry mechanism
  useEffect(() => {
    let mounted = true;
    
    // Skip fetching if no client or address
    if (!address || !publicClient) {
      setTokens([]);
      setIsLoading(false);
      return () => {
        mounted = false;
      };
    }
    
    const fetchAllTokens = async () => {
      try {
        const tokenPromises = Object.entries(SUPPORTED_TOKENS).map(([symbol, info]) => 
          fetchTokenData(info.address as Address, symbol as SupportedTokenSymbol)
        );

        const tokenData = await Promise.all(tokenPromises);
        if (mounted) {
          setTokens(tokenData);
          setIsLoading(false);
          
          // Load prices after setting initial token data
          loadTokenPrices(tokenData);
        }
      } catch (error) {
        console.error('Error fetching token data:', error);
        if (mounted) {
          setTokens([]);
          setIsLoading(false);
        }
      }
    };

    fetchAllTokens();
    
    return () => {
      mounted = false;
    };
  }, [address, publicClient]);

  return {
    tokens,
    isLoading
  };
} 