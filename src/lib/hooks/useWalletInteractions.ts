import { useState, useEffect } from 'react';
import { useAccount, useBalance, useWaitForTransactionReceipt } from 'wagmi';
import { Address } from 'viem';
import { toast } from 'react-hot-toast';

interface WalletInteractionsProps {
  transactionHash?: `0x${string}`;
}

export function useWalletInteractions({
  transactionHash
}: WalletInteractionsProps = {}) {
  const { address, isConnected } = useAccount();
  const [copied, setCopied] = useState(false);
  const [lastTxHash, setLastTxHash] = useState<`0x${string}` | undefined>(transactionHash);
  
  // Get user's balance
  const { data: balanceData } = useBalance({
    address: address as Address,
  });

  // Track transaction status
  const { data: txReceipt, isPending, isSuccess, isError } = useWaitForTransactionReceipt({
    hash: lastTxHash,
  });

  // Format address for display (0x1234...5678)
  const formatAddress = (addr?: string): string => {
    if (!addr) return '';
    return `${addr.substring(0, 6)}...${addr.substring(addr.length - 4)}`;
  };

  // Copy address to clipboard
  const copyAddress = (): void => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      toast.success('Address copied to clipboard');
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Update transaction hash from outside the hook
  const setTransactionHash = (hash: `0x${string}` | unknown): void => {
    if (typeof hash === 'string' && hash.startsWith('0x')) {
      setLastTxHash(hash as `0x${string}`);
    }
  };

  // Handle transaction status changes
  useEffect(() => {
    if (isSuccess && lastTxHash) {
      toast.success('Transaction confirmed!');
    } else if (isError && lastTxHash) {
      toast.error('Transaction failed');
    }
  }, [isSuccess, isError, lastTxHash]);

  return {
    address,
    isConnected,
    copied,
    formattedAddress: formatAddress(address),
    copyAddress,
    isPending,
    isSuccess,
    isError,
    txReceipt,
    setTransactionHash,
    balance: balanceData?.formatted,
    balanceSymbol: balanceData?.symbol,
  };
}

export default useWalletInteractions; 