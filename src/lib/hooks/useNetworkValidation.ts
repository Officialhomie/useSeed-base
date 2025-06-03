// src/lib/hooks/useNetworkValidation.ts
import { useCallback } from 'react';
import { useChainId, useSwitchChain, useAccount } from 'wagmi';
import { base } from 'wagmi/chains';

export function useNetworkValidation() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending: isSwitching, error } = useSwitchChain();
  
  const isOnCorrectNetwork = chainId === base.id; // 8453
  const needsNetworkSwitch = isConnected && !isOnCorrectNetwork;
  
  const switchToBaseNetwork = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      console.log(`🔄 Switching from chain ${chainId} to Base Mainnet (${base.id})`);
      await switchChain({ chainId: base.id });
      return true;
    } catch (error) {
      console.error('❌ Network switch failed:', error);
      throw error;
    }
  }, [isConnected, switchChain, chainId]);
  
  const validateNetworkOrThrow = useCallback(() => {
    console.log('🔍 Network validation check:', {
      isConnected,
      currentChainId: chainId,
      expectedChainId: base.id,
      isOnCorrectNetwork
    });
    
    if (!isConnected) {
      throw new Error('Please connect your wallet first');
    }
    
    if (!isOnCorrectNetwork) {
      const networkName = getNetworkName(chainId);
      throw new Error(
        `Wrong network: You're connected to ${networkName} (${chainId}). ` +
        `Please switch to Base Mainnet (${base.id}) to continue.`
      );
    }
    
    console.log('✅ Network validation passed');
    return true;
  }, [isConnected, isOnCorrectNetwork, chainId]);
  
  // Helper function to get network name
  const getNetworkName = (chainId: number): string => {
    switch (chainId) {
      case 8453: return 'Base Mainnet';
      case 84532: return 'Base Sepolia';
      case 1: return 'Ethereum Mainnet';
      case 11155111: return 'Sepolia';
      case 137: return 'Polygon';
      case 10: return 'Optimism';
      case 42161: return 'Arbitrum';
      default: return 'Unknown Network';
    }
  };
  
  return {
    isOnCorrectNetwork,
    needsNetworkSwitch,
    switchToBaseNetwork,
    validateNetworkOrThrow,
    isSwitching,
    error,
    currentChainId: chainId,
    targetChainId: base.id,
    currentNetworkName: getNetworkName(chainId),
    targetNetworkName: 'Base Mainnet'
  };
}