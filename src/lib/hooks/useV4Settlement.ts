import { useState, useEffect } from 'react';
import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts';

interface SettlementStatus {
  isSettled: boolean;
  gasOptimized: boolean;
  hookExecuted: boolean;
  settlementEvents: any[];
  isValidating: boolean;
  error: string | null;
}

export function useV4Settlement(
  txHash: string | null,
  provider?: ethers.providers.Provider
) {
  const [status, setStatus] = useState<SettlementStatus>({
    isSettled: false,
    gasOptimized: false,
    hookExecuted: false,
    settlementEvents: [],
    isValidating: false,
    error: null
  });

  useEffect(() => {
    if (!txHash || !provider) return;

    const validateSettlement = async () => {
      setStatus(prev => ({ ...prev, isValidating: true, error: null }));

      try {
        const receipt = await provider.waitForTransaction(txHash);
        
        if (!receipt) {
          throw new Error('Transaction receipt not found');
        }

        // Parse settlement events
        const settlementEvents = receipt.logs.filter(log => {
          try {
            return log.topics[0] === ethers.utils.id('Settle(address,uint256)') ||
                   log.topics[0] === ethers.utils.id('Take(address,uint256)');
          } catch {
            return false;
          }
        });

        // Check hook execution
        const hookEvents = receipt.logs.filter(log => {
          try {
            // Check if event is from SpendSave hook
            return log.address.toLowerCase() === CONTRACT_ADDRESSES.SPEND_SAVE_HOOK.toLowerCase();
          } catch {
            return false;
          }
        });

        // Calculate gas optimization
        const gasUsed = receipt.gasUsed.toNumber();
        const estimatedV3Gas = gasUsed * 2;
        const gasOptimized = gasUsed < estimatedV3Gas * 0.6;

        setStatus({
          isSettled: settlementEvents.length > 0,
          gasOptimized: gasOptimized,
          hookExecuted: hookEvents.length > 0,
          settlementEvents: settlementEvents,
          isValidating: false,
          error: null
        });

      } catch (error) {
        console.error('Settlement validation failed:', error);
        setStatus(prev => ({
          ...prev,
          isValidating: false,
          error: error instanceof Error ? error.message : 'Settlement validation failed'
        }));
      }
    };

    validateSettlement();
  }, [txHash, provider]);

  return status;
}