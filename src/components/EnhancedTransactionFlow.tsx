"use client";

import { useState, useEffect } from "react";
import { useAccount, useChainId, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { motion, AnimatePresence } from "framer-motion";

// Simple Confetti Animation Component
const ConfettiAnimation = () => {
  return (
    <div className="confetti-container fixed inset-0 pointer-events-none overflow-hidden z-50">
      {Array.from({ length: 100 }).map((_, i) => (
        <div 
          key={i}
          className="confetti absolute w-2 h-4 animate-fall"
          style={{
            left: `${Math.random() * 100}%`,
            top: '-20px',
            animationDelay: `${Math.random() * 3}s`,
            backgroundColor: `hsl(${Math.random() * 360}, 80%, 60%)`,
            transform: `rotate(${Math.random() * 360}deg)`,
          }}
        />
      ))}
      <style jsx>{`
        @keyframes fall {
          0% {
            top: -20px;
            transform: translateX(0) rotate(0deg);
          }
          100% {
            top: 100vh;
            transform: translateX(${Math.random() > 0.5 ? '100px' : '-100px'}) rotate(${Math.random() * 360}deg);
          }
        }
        .animate-fall {
          animation: fall 3s linear forwards;
        }
      `}</style>
    </div>
  );
};

// Helper function to extract user-friendly error messages
function extractErrorMessage(error: any): string {
  if (!error) return "Unknown error";
  
  // Extract common error patterns from various providers
  if (typeof error === 'string') return error;
  
  // Handle Error objects
  if (error.message) {
    // Clean up common blockchain error messages
    const message = error.message;
    
    // Check for gas estimation errors
    if (message.includes('gas required exceeds allowance')) {
      return 'Transaction would run out of gas. You might need to increase gas limit.';
    }
    
    // Check for user rejections
    if (message.includes('user rejected') || message.includes('User denied')) {
      return 'Transaction was rejected in your wallet.';
    }
    
    // Check for slippage errors
    if (message.includes('INSUFFICIENT_OUTPUT_AMOUNT') || message.includes('slippage')) {
      return 'Price moved unfavorably beyond slippage tolerance.';
    }
    
    // Check for balance errors
    if (message.includes('insufficient funds')) {
      return 'Your wallet has insufficient funds for this transaction.';
    }
    
    // Check for nonce errors
    if (message.includes('nonce')) {
      return 'Transaction nonce issue. Try refreshing the page.';
    }
    
    // Check for contract errors (revert reasons)
    if (message.includes('execution reverted')) {
      // Try to extract revert reason
      const revertMatch = message.match(/reverted: (.*?)(?:"|$)/);
      if (revertMatch && revertMatch[1]) {
        return `Smart contract error: ${revertMatch[1]}`;
      }
      return 'Transaction was rejected by the smart contract.';
    }
    
    return message;
  }
  
  return "Transaction failed. Please try again.";
}

// Define types for the component props
interface EnhancedTransactionFlowProps {
  contractAddress: `0x${string}`;
  abi: any;
  functionName: string;
  args: any[];
  value?: bigint;
  onSuccess: (data: any) => void;
  onError: (error: any) => void;
  successMessage?: string;
  pendingMessage?: string;
  errorMessage?: string;
  loadingButtonText?: string;
  buttonText?: string;
  confirmationCount?: number;
  _estimateGasMultiplier?: number;
  _simulateTransaction?: boolean;
}

// Reusable transaction component with optimistic UI updates
export function EnhancedTransactionFlow({
  contractAddress,
  abi,
  functionName,
  args,
  value = BigInt(0),
  onSuccess,
  onError,
  successMessage = "Transaction successful!",
  pendingMessage = "Transaction in progress...",
  errorMessage = "Transaction failed",
  loadingButtonText = "Confirming...",
  buttonText = "Submit",
  confirmationCount = 1, // Number of confirmations to wait for
  _estimateGasMultiplier = 1.1, // Add 10% buffer to gas estimate
  _simulateTransaction = true, // Whether to simulate the transaction
}: EnhancedTransactionFlowProps) {
  const chainId = useChainId();
  const { chain: _chain } = useAccount();
  
  // Transaction state
  const [_isAwaitingApproval, setIsAwaitingApproval] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [showConfetti, setShowConfetti] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  // Contract write hook
  const { 
    writeContract, 
    data: hash,
    error: writeError,
    isPending: isWriteLoading,
    reset: resetWrite
  } = useWriteContract();
  
  // Transaction tracking
  const { 
    data: txData,
    isSuccess: isTxSuccess,
    isPending: isTxLoading,
    error: txError
  } = useWaitForTransactionReceipt({
    hash,
    confirmations: confirmationCount
  });

  // Handle transaction start
  const handleTransaction = async () => {
    try {
      setIsAwaitingApproval(true);
      setIsSuccess(false);
      setError(null);
      
      await writeContract({
        address: contractAddress,
        abi,
        functionName,
        args,
        value
      });
    } catch (err) {
      setError(err as Error);
      if (onError) onError(err);
      setIsAwaitingApproval(false);
    }
  };

  // Reset transaction flow
  const resetTransaction = () => {
    setIsAwaitingApproval(false);
    setIsSuccess(false);
    setTxHash(undefined);
    setShowConfetti(false);
    setError(null);
    resetWrite();
  };

  // Update UI states based on transaction status
  useEffect(() => {
    if (hash) {
      setTxHash(hash);
      setIsAwaitingApproval(false);
    }
  }, [hash]);

  useEffect(() => {
    if (isTxSuccess) {
      setIsSuccess(true);
      setShowConfetti(true);
      if (onSuccess) onSuccess(txData);
      
      // Auto-hide confetti after 5 seconds
      const timer = setTimeout(() => {
        setShowConfetti(false);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [isTxSuccess, txData, onSuccess]);

  useEffect(() => {
    if (txError || writeError) {
      setIsAwaitingApproval(false);
      setError(txError || writeError);
      if (onError) onError(txError || writeError);
    }
  }, [txError, writeError, onError]);

  // Calculate transaction status and messages
  const isPending = isWriteLoading || isTxLoading;
  const errorMessages = error ? extractErrorMessage(error) : null;

  // Get block explorer info
  const getBlockExplorer = () => {
    // Use type assertion to handle chainId type checking
    if (chainId as number === 1) return { url: "https://etherscan.io", name: "Etherscan" };
    if (chainId as number === 137) return { url: "https://polygonscan.com", name: "PolygonScan" };
    if (chainId as number === 42161) return { url: "https://arbiscan.io", name: "ArbiScan" };
    if (chainId as number === 10) return { url: "https://optimistic.etherscan.io", name: "Optimism Explorer" };
    if (chainId as number === 56) return { url: "https://bscscan.com", name: "BscScan" };
    if (chainId === 8453) return { url: "https://basescan.org", name: "BaseScan" };
    if (chainId === 84532) return { url: "https://sepolia.basescan.org", name: "Base Sepolia Scan" };
    return { url: "#", name: "Block Explorer" };
  };

  const blockExplorer = getBlockExplorer();

  return (
    <div className="transaction-flow-container">
      {/* Transaction Status Display */}
      <AnimatePresence>
        {isPending && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 mb-4 border border-blue-500 bg-blue-500/10 rounded-lg flex items-center"
          >
            <div className="animate-spin w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full mr-3"></div>
            <div>
              <p className="text-blue-500 font-medium">{pendingMessage}</p>
              {txHash && (
                <a 
                  href={`${blockExplorer.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-blue-400 hover:text-blue-300 underline"
                >
                  View on {blockExplorer.name}
                </a>
              )}
            </div>
          </motion.div>
        )}

        {isSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 mb-4 border border-green-500 bg-green-500/10 rounded-lg flex items-center"
          >
            <div className="w-5 h-5 bg-green-500 text-white flex items-center justify-center rounded-full mr-3">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-green-500 font-medium">{successMessage}</p>
              {txHash && (
                <a 
                  href={`${blockExplorer.url}/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-green-400 hover:text-green-300 underline"
                >
                  View on {blockExplorer.name}
                </a>
              )}
            </div>
          </motion.div>
        )}

        {errorMessages && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="p-4 mb-4 border border-red-500 bg-red-500/10 rounded-lg flex items-start"
          >
            <div className="w-5 h-5 bg-red-500 text-white flex items-center justify-center rounded-full mr-3 mt-0.5">
              <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M18 6L6 18M6 6L18 18" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <div>
              <p className="text-red-500 font-medium">{errorMessage}</p>
              <p className="text-sm text-red-400 mt-1">{errorMessages}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Transaction Button */}
      <button
        onClick={handleTransaction}
        disabled={isPending || isSuccess}
        className={`w-full h-12 rounded-lg font-medium transition-all ${
          isPending 
            ? 'bg-blue-500/50 text-blue-300 cursor-wait' 
            : isSuccess 
            ? 'bg-green-500 text-white' 
            : 'bg-blue-600 hover:bg-blue-500 text-white'
        }`}
      >
        {isPending ? loadingButtonText : isSuccess ? "Transaction Complete" : buttonText}
      </button>

      {/* Reset Button (shown after successful transaction) */}
      {isSuccess && (
        <button
          onClick={resetTransaction}
          className="w-full mt-3 py-2 px-4 border border-gray-300 rounded-lg text-sm hover:bg-gray-100 transition-colors"
        >
          Start New Transaction
        </button>
      )}

      {/* Confetti Animation */}
      {showConfetti && <ConfettiAnimation />}
    </div>
  );
}

// Example usage component for DCA setup
export function SetupDCAExample() {
  const [amount, setAmount] = useState("0.1");
  const [frequency, setFrequency] = useState("weekly");
  
  const handleSuccess = (txData: any) => {
    console.log("DCA setup successful!", txData);
    // Update UI or navigate to success page
  };
  
  const handleError = (error: any) => {
    console.error("DCA setup failed:", error);
    // Handle error appropriately
  };
  
  return (
    <div className="p-6 rounded-xl border border-gray-800 bg-gray-900/50">
      <h2 className="text-xl font-bold mb-6">Set Up Dollar-Cost Averaging</h2>
      
      <div className="space-y-4 mb-6">
        <div>
          <label className="block text-sm text-gray-400 mb-2">Amount (ETH)</label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            min="0.001"
            step="0.001"
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
        
        <div>
          <label className="block text-sm text-gray-400 mb-2">Frequency</label>
          <select 
            value={frequency}
            onChange={(e) => setFrequency(e.target.value)}
            className="w-full p-3 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="daily">Daily</option>
            <option value="weekly">Weekly</option>
            <option value="monthly">Monthly</option>
          </select>
        </div>
      </div>
      
      <EnhancedTransactionFlow
        contractAddress={"0x123..." as `0x${string}`} // Example address, replace with actual
        abi={[
          {
            name: "enableDCA",
            type: "function",
            stateMutability: "nonpayable",
            inputs: [
              { name: "user", type: "address" },
              { name: "token", type: "address" },
              { name: "enabled", type: "bool" }
            ],
            outputs: [],
          }
        ]}
        functionName="enableDCA"
        args={[
          "0x456..." as `0x${string}`, // User address
          "0x789..." as `0x${string}`, // Token address
          true
        ]}
        successMessage="DCA strategy activated successfully!"
        buttonText="Activate DCA Strategy"
        onSuccess={handleSuccess}
        onError={handleError}
      />
    </div>
  );
} 