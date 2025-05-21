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
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    // Create ethers provider for read-only operations
    let provider: ethers.providers.Provider;
    let signer: ethers.Signer | null = null;

    // Only access window in browser environment
    if (typeof window !== 'undefined') {
      try {
        // Check for window.ethereum first (injected wallet)
        if (window.ethereum) {
          // Create provider from window.ethereum
          provider = new ethers.providers.Web3Provider(window.ethereum as ethers.providers.ExternalProvider);
          
          // Add signer if connected
          if (isConnected && walletClient) {
            signer = (provider as ethers.providers.Web3Provider).getSigner();
          }
        } else {
          // Fallback to reliable public RPCs - avoid localhosts
          const fallbackRpcs = [
            'https://mainnet.base.org', 
            'https://base-mainnet-rpc.publicnode.com'
          ];
          
          try {
            // Try creating a FallbackProvider with multiple RPCs for reliability
            const providers = fallbackRpcs.map(url => 
              new ethers.providers.JsonRpcProvider(url)
            );
            provider = new ethers.providers.FallbackProvider(providers, 1);
          } catch (fallbackError) {
            // If FallbackProvider fails, use a single RPC
            console.warn('FallbackProvider creation failed, using single RPC', fallbackError);
            provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
          }
        }
        
        // Create client with proper API key from env
        const apiKey = process.env.NEXT_PUBLIC_BASESCAN_API_KEY || '';
        if (!apiKey) {
          console.warn('No BaseScan API key found in environment variables (NEXT_PUBLIC_BASESCAN_API_KEY)');
        }
        
        const newClient = new UniswapV4Client(provider, signer || undefined);
        
        // Initialize with address if available
        if (address) {
          newClient.init(address).catch(err => {
            console.error('Error initializing UniswapV4Client:', err);
            setError(new Error(`Failed to initialize client: ${err.message}`));
          });
        }

        setClient(newClient);
        setError(null);
      } catch (err) {
        console.error('Error creating UniswapV4Client:', err);
        // Fall back to RPC provider in case of window.ethereum errors
        try {
          // Use mainnet.base.org directly to avoid potential localhost default
          provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
          const newClient = new UniswapV4Client(provider, undefined);
          setClient(newClient);
          setError(new Error(`Using read-only connection: ${err instanceof Error ? err.message : String(err)}`));
        } catch (fallbackErr) {
          setError(new Error(`Failed to create client: ${fallbackErr instanceof Error ? fallbackErr.message : String(fallbackErr)}`));
        }
      }
    } else {
      // Server-side rendering - create dummy client
      provider = new ethers.providers.JsonRpcProvider('https://mainnet.base.org');
      const newClient = new UniswapV4Client(provider, undefined);
      setClient(newClient);
    }

    // Cleanup function
    return () => {
      // No cleanup needed for client
    };
  }, [isConnected, walletClient, address]);

  return { 
    client,
    error,
    isReadOnly: !isConnected || !client?.signer
  };
} 