import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, usePublicClient } from 'wagmi';
import { Address, parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { createPoolKey } from '../uniswap/UniswapV4Integration';

interface DCAValidationError {
  code: 'INSUFFICIENT_BALANCE' | 'INVALID_TOKEN' | 'NETWORK_ERROR' | 'VALIDATION_FAILED';
  message: string;
  details?: any;
}

interface DCAQueueItem {
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  executionTick: number;
  deadline: bigint;
  executed: boolean;
  customSlippageTolerance: number;
}

interface UseDCAManagementResult {
  dcaEnabled: boolean;
  dcaTargetToken: Address | null;
  dcaQueueItems: DCAQueueItem[];
  isLoading: boolean;
  error: Error | null;
  enableDCA: (targetToken: Address) => Promise<void>;
  disableDCA: () => Promise<void>;
  setDCATickStrategy: (
    tickDelta: number,
    expiryTimeSeconds: number,
    onlyImprovePrice: boolean,
    minTickImprovement: number,
    dynamicSizing: boolean
  ) => Promise<void>;
  executeQueuedDCAs: () => Promise<void>;
  executeSpecificDCA: (fromToken: Address, amount: bigint, customSlippageTolerance?: number) => Promise<void>;
  processTokenSwap: (fromToken: Address, toToken: Address, amount: bigint) => Promise<void>;
  refreshQueueData: () => Promise<void>;
  validateDCAParameters: (
    tickDelta: number,
    expiryTimeSeconds: number,
    minTickImprovement: number
  ) => DCAValidationError | null;
}
// 07031685998

export default function useDCAManagement(): UseDCAManagementResult {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Read DCA status
  const { data: dcaTargetToken } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'dcaTargetToken',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'address' }]
      }
    ],
    functionName: 'dcaTargetToken',
    args: address ? [address] : undefined,
  });

  // Determine if DCA is enabled
  const dcaEnabled = !!dcaTargetToken && dcaTargetToken !== '0x0000000000000000000000000000000000000000' as Address;

  // Read DCA queue length
  const { data: queueLength } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getDcaQueueLength',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [{ name: '', type: 'uint256' }]
      }
    ],
    functionName: 'getDcaQueueLength',
    args: address ? [address] : undefined,
  });

  // Prepare array to hold queue items
  const [dcaQueueItems, setDcaQueueItems] = useState<DCAQueueItem[]>([]);

  // Read DCA queue items
  const fetchQueueItems = async () => {
    if (!address || !queueLength || queueLength === BigInt(0)) {
      setDcaQueueItems([]);
      return;
    }

    try {
      const newQueueItems: DCAQueueItem[] = [];
      
      for (let i = 0; i < Number(queueLength); i++) {
        const queueItem = await readDCAQueueItem(address, i);
        if (queueItem) {
          newQueueItems.push(queueItem);
        }
      }
      
      setDcaQueueItems(newQueueItems);
    } catch (err) {
      console.error('Error fetching DCA queue items:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch DCA queue items'));
    }
  };

  // Read a single DCA queue item
  const readDCAQueueItem = async (user: Address, index: number): Promise<DCAQueueItem | null> => {
    try {
      // This is simplified - in a real implementation you would use contract.read
      const result = await fetch('/api/read-dca-queue-item', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user, index }),
      }).then(res => res.json());
      
      if (result && result.data) {
        return {
          fromToken: result.data[0] as Address,
          toToken: result.data[1] as Address,
          amount: BigInt(result.data[2]),
          executionTick: Number(result.data[3]),
          deadline: BigInt(result.data[4]),
          executed: result.data[5],
          customSlippageTolerance: Number(result.data[6]),
        };
      }
      return null;
    } catch (err) {
      console.error(`Error reading DCA queue item ${index}:`, err);
      return null;
    }
  };

  // Update queue items when queueLength changes
  useEffect(() => {
    if (address && queueLength !== undefined) {
      fetchQueueItems();
    }
  }, [address, queueLength]);

  // Contract write hooks
  const { writeContractAsync } = useWriteContract();

  // Enable DCA function
  const enableDCA = async (targetToken: Address) => {
    if (!address) {
      const error: DCAValidationError = {
        code: 'VALIDATION_FAILED',
        message: 'Wallet not connected'
      };
      setError(new Error(error.message));
      return;
    }
    
    // Validate target token
    if (!targetToken || targetToken === '0x0000000000000000000000000000000000000000') {
      const error: DCAValidationError = {
        code: 'INVALID_TOKEN',
        message: 'Invalid target token address'
      };
      setError(new Error(error.message));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log(`Enabling DCA for user ${address} with target token ${targetToken}`);
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DCA,
        abi: [
          {
            name: 'enableDCA',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'targetToken', type: 'address' },
              { name: 'enable', type: 'bool' }
            ],
            outputs: []
          }
        ],
        functionName: 'enableDCA',
        args: [address, targetToken, true],
      });
      
      console.log(`DCA enable transaction sent: ${hash}`);
      
      // Wait for confirmation
      await waitForTransaction(hash);
      
      console.log(`DCA enabled successfully for ${targetToken}`);
      
      // Refresh queue items after enabling
      await fetchQueueItems();
      
    } catch (err) {
      console.error('Error enabling DCA:', err);
      
      let error: DCAValidationError;
      
      if (err instanceof Error) {
        if (err.message.includes('insufficient funds')) {
          error = {
            code: 'INSUFFICIENT_BALANCE',
            message: 'Insufficient ETH for gas fees',
            details: err.message
          };
        } else if (err.message.includes('user rejected')) {
          error = {
            code: 'VALIDATION_FAILED',
            message: 'Transaction rejected by user'
          };
        } else {
          error = {
            code: 'NETWORK_ERROR',
            message: 'Network error occurred while enabling DCA',
            details: err.message
          };
        }
      } else {
        error = {
          code: 'NETWORK_ERROR',
          message: 'Unknown error occurred',
          details: String(err)
        };
      }
      
      setError(new Error(error.message));
    } finally {
      setIsLoading(false);
    }
  };


  const validateDCAParameters = (
    tickDelta: number,
    expiryTimeSeconds: number,
    minTickImprovement: number
  ): DCAValidationError | null => {
    if (tickDelta < 0 || tickDelta > 1000) {
      return {
        code: 'VALIDATION_FAILED',
        message: 'Tick delta must be between 0 and 1000'
      };
    }
    
    if (expiryTimeSeconds < 3600 || expiryTimeSeconds > 604800) { // 1 hour to 1 week
      return {
        code: 'VALIDATION_FAILED',
        message: 'Expiry time must be between 1 hour and 1 week'
      };
    }
    
    if (minTickImprovement < 0 || minTickImprovement > 100) {
      return {
        code: 'VALIDATION_FAILED',
        message: 'Minimum tick improvement must be between 0 and 100'
      };
    }
    
    return null;
  };

  // Disable DCA function
  const disableDCA = async () => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DCA,
        abi: [
          {
            name: 'enableDCA',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'targetToken', type: 'address' },
              { name: 'enable', type: 'bool' }
            ],
            outputs: []
          }
        ],
        functionName: 'enableDCA',
        args: [
          address, 
          dcaTargetToken || '0x0000000000000000000000000000000000000000' as Address, 
          false
        ],
      });
      
      await waitForTransaction(hash);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to disable DCA'));
      console.error('Error disabling DCA:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Set DCA tick strategy
  const setDCATickStrategy = async (
    tickDelta: number,
    expiryTimeSeconds: number,
    onlyImprovePrice: boolean,
    minTickImprovement: number,
    dynamicSizing: boolean
  ) => {
    if (!address) {
      setError(new Error('Wallet not connected'));
      return;
    }
    
    // Validate parameters
    const validationError = validateDCAParameters(tickDelta, expiryTimeSeconds, minTickImprovement);
    if (validationError) {
      setError(new Error(validationError.message));
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Setting DCA tick strategy:', {
        tickDelta,
        expiryTimeSeconds,
        onlyImprovePrice,
        minTickImprovement,
        dynamicSizing
      });
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DCA,
        abi: [
          {
            name: 'setDCATickStrategy',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'tickDelta', type: 'int24' },
              { name: 'expiryTimeSeconds', type: 'uint256' },
              { name: 'onlyImprovePrice', type: 'bool' },
              { name: 'minTickImprovement', type: 'int24' },
              { name: 'dynamicSizing', type: 'bool' }
            ],
            outputs: []
          }
        ],
        functionName: 'setDCATickStrategy',
        args: [
          address,
          tickDelta,
          BigInt(expiryTimeSeconds),
          onlyImprovePrice,
          minTickImprovement,
          dynamicSizing
        ],
      });
      
      console.log(`DCA tick strategy transaction sent: ${hash}`);
      await waitForTransaction(hash);
      console.log('DCA tick strategy set successfully');
      
    } catch (err) {
      console.error('Error setting DCA tick strategy:', err);
      setError(err instanceof Error ? err : new Error('Failed to set DCA tick strategy'));
    } finally {
      setIsLoading(false);
    }
  };

  // Execute queued DCAs
  const executeQueuedDCAs = async () => {
    if (!address || !dcaTargetToken || dcaQueueItems.length === 0) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const poolKey = createPoolKey(
        dcaQueueItems[0].fromToken,
        dcaQueueItems[0].toToken
      );
      
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DCA,
        abi: [
          {
            name: 'processQueuedDCAs',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { 
                name: 'poolKey', 
                type: 'tuple',
                components: [
                  { name: 'currency0', type: 'address' },
                  { name: 'currency1', type: 'address' },
                  { name: 'fee', type: 'uint24' },
                  { name: 'tickSpacing', type: 'int24' },
                  { name: 'hooks', type: 'address' }
                ]
              }
            ],
            outputs: []
          }
        ],
        functionName: 'processQueuedDCAs',
        args: [address, poolKey],
      });
      
      await waitForTransaction(hash);
      await fetchQueueItems(); // Refresh queue items
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to execute queued DCAs'));
      console.error('Error executing queued DCAs:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const refreshQueueData = async () => {
    if (!address) return;
    
    try {
      await fetchQueueItems();
      console.log('DCA queue data refreshed successfully');
    } catch (error) {
      console.error('Failed to refresh DCA queue:', error);
    }
  };

  // Execute specific DCA
  const executeSpecificDCA = async (
    fromToken: Address,
    amount: bigint,
    customSlippageTolerance: number = 0
  ) => {
    if (!address || !dcaTargetToken) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DCA,
        abi: [
          {
            name: 'executeDCA',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'fromToken', type: 'address' },
              { name: 'amount', type: 'uint256' },
              { name: 'customSlippageTolerance', type: 'uint256' }
            ],
            outputs: []
          }
        ],
        functionName: 'executeDCA',
        args: [
          address,
          fromToken,
          amount,
          BigInt(customSlippageTolerance)
        ],
      });
      
      await waitForTransaction(hash);
      await fetchQueueItems(); // Refresh queue items
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to execute DCA'));
      console.error('Error executing DCA:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Process token swap
  const processTokenSwap = async (
    fromToken: Address,
    toToken: Address,
    amount: bigint
  ) => {
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const hash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.DCA,
        abi: [
          {
            name: 'processSpecificTokenSwap',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'fromToken', type: 'address' },
              { name: 'toToken', type: 'address' },
              { name: 'amount', type: 'uint256' }
            ],
            outputs: []
          }
        ],
        functionName: 'processSpecificTokenSwap',
        args: [address, fromToken, toToken, amount],
      });
      
      await waitForTransaction(hash);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to process token swap'));
      console.error('Error processing token swap:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Helper function to wait for transaction confirmation using the viem public client.
  const waitForTransaction = async (hash: `0x${string}`) => {
    if (!publicClient) return;
    await publicClient.waitForTransactionReceipt({ hash });
  };

  return {
    dcaEnabled,
    dcaTargetToken: dcaTargetToken || null,
    dcaQueueItems,
    isLoading,
    error,
    enableDCA,
    disableDCA,
    setDCATickStrategy,
    executeQueuedDCAs,
    executeSpecificDCA,
    processTokenSwap,
    refreshQueueData, 
    validateDCAParameters, 
  };
} 