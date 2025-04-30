import { useState, useEffect } from 'react';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { Address, parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { createPoolKey } from '../uniswap/UniswapV4Integration';

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
}

export default function useDCAManagement(): UseDCAManagementResult {
  const { address } = useAccount();
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
        args: [address, targetToken, true],
      });
      
      await waitForTransaction(hash);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to enable DCA'));
      console.error('Error enabling DCA:', err);
    } finally {
      setIsLoading(false);
    }
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
    if (!address) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
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
      
      await waitForTransaction(hash);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Failed to set DCA tick strategy'));
      console.error('Error setting DCA tick strategy:', err);
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

  // Helper function to wait for transaction
  const waitForTransaction = async (hash: `0x${string}`) => {
    const { waitForTransactionReceipt } = await import('wagmi/actions');
    await waitForTransactionReceipt(hash);
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
    processTokenSwap
  };
} 