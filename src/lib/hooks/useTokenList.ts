import { useState, useEffect } from 'react';
import { useAccount, useReadContract } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import TokenABI from '@/ABI/Token.json';

export interface Token {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  balance: string;
  price: number;
}

export function useTokenList() {
  const { address } = useAccount();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Get token balances
  const fetchTokenData = async (tokenAddress: Address) => {
    const { data: tokenData } = await useReadContract({
      address: tokenAddress,
      abi: TokenABI,
      functionName: 'name',
    }) as { data: string };

    const { data: symbolData } = await useReadContract({
      address: tokenAddress,
      abi: TokenABI,
      functionName: 'symbol',
    }) as { data: string };

    const { data: decimalsData } = await useReadContract({
      address: tokenAddress,
      abi: TokenABI,
      functionName: 'decimals',
    }) as { data: number };

    const { data: balanceData } = await useReadContract({
      address: tokenAddress,
      abi: TokenABI,
      functionName: 'balanceOf',
      args: [address],
    }) as { data: bigint };

    // For now, we'll use a mock price since we don't have a price feed contract
    const tokenPrice = tokenAddress === CONTRACT_ADDRESSES.ETH || tokenAddress === CONTRACT_ADDRESSES.WETH 
      ? 1850 
      : tokenAddress === CONTRACT_ADDRESSES.USDC 
        ? 1 
        : 0;

    return {
      name: tokenData,
      symbol: symbolData,
      address: tokenAddress,
      decimals: decimalsData,
      balance: formatUnits(balanceData || BigInt(0), decimalsData),
      price: tokenPrice
    } as Token;
  };

  useEffect(() => {
    const loadTokens = async () => {
      try {
        setIsLoading(true);
        const tokenAddresses = [
          CONTRACT_ADDRESSES.ETH,
          CONTRACT_ADDRESSES.USDC,
          CONTRACT_ADDRESSES.WETH,
        ];

        const tokenDataPromises = tokenAddresses.map(fetchTokenData);
        const tokenData = await Promise.all(tokenDataPromises);
        setTokens(tokenData);
      } catch (error) {
        console.error('Error loading tokens:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (address) {
      loadTokens();
    }
  }, [address]);

  return { tokens, isLoading };
} 