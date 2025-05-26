import { useCallback } from 'react';
import { useChainId, useSwitchChain, useAccount } from 'wagmi';
import { base } from 'wagmi/chains';

export function useNetworkValidation() {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending: isSwitching, error } = useSwitchChain();
  
  const isOnCorrectNetwork = chainId === base.id;
  const needsNetworkSwitch = isConnected && !isOnCorrectNetwork;
  
  const switchToBaseNetwork = useCallback(async () => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    try {
      await switchChain({ chainId: base.id });
      return true;
    } catch (error) {
      console.error('Network switch failed:', error);
      throw error;
    }
  }, [isConnected, switchChain]);
  
  const validateNetworkOrThrow = useCallback(() => {
    if (!isConnected) {
      throw new Error('Please connect your wallet first');
    }
    
    if (!isOnCorrectNetwork) {
      throw new Error('Please switch to Base mainnet to continue');
    }
    
    return true;
  }, [isConnected, isOnCorrectNetwork]);
  
  return {
    isOnCorrectNetwork,
    needsNetworkSwitch,
    switchToBaseNetwork,
    validateNetworkOrThrow,
    isSwitching,
    error,
    currentChainId: chainId,
    targetChainId: base.id
  };
}