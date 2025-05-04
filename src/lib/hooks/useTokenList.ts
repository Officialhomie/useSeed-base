import { useState, useEffect } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import TokenABI from '@/ABI/Token.json';
import { SUPPORTED_TOKENS, SupportedTokenSymbol } from '../uniswap/tokens';

export interface Token {
  symbol: SupportedTokenSymbol;
  name: string;
  address: Address;
  decimals: number;
  balance: string;
  price: number;
}

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
        price: symbol === 'WETH' ? 1850 : symbol === 'USDC' ? 1 : symbol === 'DAI' ? 1 : 0
      } as Token;
    }
    
    const tokenInfo = SUPPORTED_TOKENS[symbol];
    
    // For native ETH, handle differently
    if (symbol === 'ETH') {
      try {
        const ethBalance = await publicClient.getBalance({ 
          address: address 
        });
        
        return {
          name: tokenInfo.name,
          symbol,
          address: tokenAddress,
          decimals: tokenInfo.decimals,
          balance: formatUnits(ethBalance, tokenInfo.decimals),
          price: 1850 // Mock price for ETH
        } as Token;
      } catch (error) {
        console.warn(`Error fetching ETH balance:`, error);
        return {
          name: tokenInfo.name,
          symbol,
          address: tokenAddress,
          decimals: tokenInfo.decimals,
          balance: '0',
          price: 1850
        } as Token;
      }
    }

    try {
      // Use the standard ERC20 ABI for all token contracts
      const balanceData = await publicClient.readContract({
        address: tokenAddress,
        abi: erc20BalanceOfAbi,
        functionName: 'balanceOf',
        args: [address],
      }) as bigint;

      // For now, we'll use mock prices since we don't have a price feed contract
      const tokenPrice = symbol === 'WETH' 
        ? 1850 
        : symbol === 'USDC' 
          ? 1 
          : symbol === 'DAI'
            ? 1
            : 0;

      return {
        name: tokenInfo.name,
        symbol,
        address: tokenAddress,
        decimals: tokenInfo.decimals,
        balance: formatUnits(balanceData || BigInt(0), tokenInfo.decimals),
        price: tokenPrice
      } as Token;
    } catch (error) {
      console.warn(`Error fetching balance for ${symbol}:`, error);
      return {
        name: tokenInfo.name,
        symbol,
        address: tokenAddress,
        decimals: tokenInfo.decimals,
        balance: '0',
        price: symbol === 'WETH' ? 1850 : symbol === 'USDC' ? 1 : symbol === 'DAI' ? 1 : 0
      } as Token;
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
        }
      } catch (error) {
        console.error('Error fetching token data:', error);
        if (mounted) {
          setTokens([]);
        }
      } finally {
        if (mounted) {
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