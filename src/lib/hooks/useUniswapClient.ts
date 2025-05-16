"use client";

import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { useAccount, useWalletClient } from 'wagmi';
import { UniswapV4Client } from '../uniswap/UniswapV4Client';

/**
 * Hook that provides a UniswapV4Client instance
 * Creates the client with the current wallet provider and signer
 */
export function useUniswapClient() {
  const [client, setClient] = useState<UniswapV4Client | null>(null);
  const { isConnected, address } = useAccount();
  const { data: walletClient } = useWalletClient();

  useEffect(() => {
    // Create ethers provider for read-only operations
    let provider: ethers.providers.Provider;
    let signer: ethers.Signer | null = null;

    // Only access window in browser environment
    if (typeof window !== 'undefined' && window.ethereum) {
      // Create provider from window.ethereum
      provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
      
      // Add signer if connected
      if (isConnected && walletClient) {
        signer = (provider as ethers.providers.Web3Provider).getSigner();
      }
    } else {
      // Fallback to RPC provider if no wallet is connected
      // Use Base Sepolia RPC URL
      provider = new ethers.providers.JsonRpcProvider('https://sepolia.base.org');
    }

    // Create client
    const newClient = new UniswapV4Client(provider, signer);
    
    // Initialize with address if available
    if (address) {
      newClient.init(address).catch(err => {
        console.error('Error initializing UniswapV4Client:', err);
      });
    }

    setClient(newClient);

    // Cleanup function
    return () => {
      // No cleanup needed for client
    };
  }, [isConnected, walletClient, address]);

  return { client };
} 