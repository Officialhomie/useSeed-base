"use client";

import { useState, useEffect } from "react";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { motion } from "framer-motion";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import DailySavingsABI from "@/ABI/DailySavings.json";

export default function WithdrawSavings({ onClose, savedTokens = [] }: { 
  onClose: () => void, 
  savedTokens?: { symbol: string, balance: string, address: string }[] 
}) {
  const { address } = useAccount();
  const [selectedToken, setSelectedToken] = useState("");
  const [amountToWithdraw, setAmountToWithdraw] = useState("");
  const [maxAmount, setMaxAmount] = useState("0");
  const [loading, setLoading] = useState(false);
  const [penalty, setPenalty] = useState(0);
  const [timelockEnd, setTimelockEnd] = useState<Date | null>(null);
  const [step, setStep] = useState(1);
  const [withdrawTxHash, setWithdrawTxHash] = useState<`0x${string}` | undefined>();
  
  // Demo data for tokens if none provided
  const demoTokens = [
    { symbol: "ETH", balance: "0.45", address: CONTRACT_ADDRESSES.ETH },
    { symbol: "USDC", balance: "124.50", address: CONTRACT_ADDRESSES.USDC },
    { symbol: "WETH", balance: "0.12", address: CONTRACT_ADDRESSES.WETH },
  ];
  
  const tokens = savedTokens.length > 0 ? savedTokens : demoTokens;
  
  // Set initial selected token
  useEffect(() => {
    if (tokens.length > 0 && !selectedToken) {
      setSelectedToken(tokens[0].address);
      setMaxAmount(tokens[0].balance);
    }
  }, [tokens, selectedToken]);
  
  // Contract write hook
  const { writeContract, data: txHash } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  // Update max amount when token changes
  useEffect(() => {
    const token = tokens.find(t => t.address === selectedToken);
    if (token) {
      setMaxAmount(token.balance);
    }
  }, [selectedToken, tokens]);
  
  // Read savings status for the selected token
  const { data: savingsStatus } = useReadContract({
    address: CONTRACT_ADDRESSES.DAILY_SAVINGS as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'getDailySavingsStatus',
    args: [address, selectedToken as `0x${string}`],
    enabled: !!address && !!selectedToken,
  });
  
  // Calculate penalties and timelock
  useEffect(() => {
    if (savingsStatus && amountToWithdraw && parseFloat(amountToWithdraw) > 0) {
      // Check if goal has been reached
      const goalReached = savingsStatus.goalAmount > 0 && 
                           savingsStatus.currentAmount >= savingsStatus.goalAmount;
      
      if (!goalReached) {
        // Calculate penalty
        const penaltyPercentage = savingsStatus.penaltyAmount ? 
          Number(savingsStatus.penaltyAmount) / 100 : 5; // Default to 5%
        
        const withdrawAmount = parseFloat(amountToWithdraw);
        const calculatedPenalty = withdrawAmount * (penaltyPercentage / 100);
        setPenalty(calculatedPenalty);
        
        // Set a mock timelock end date 2 days from now
        const mockDate = new Date();
        mockDate.setDate(mockDate.getDate() + 2);
        setTimelockEnd(mockDate);
      } else {
        // No penalty if goal is reached
        setPenalty(0);
        setTimelockEnd(null);
      }
    }
  }, [savingsStatus, amountToWithdraw]);
  
  // Handle successful transaction
  useEffect(() => {
    if (isTxSuccess && txHash) {
      setLoading(false);
      setWithdrawTxHash(txHash);
      setStep(3);
    }
  }, [isTxSuccess, txHash]);
  
  const handleTokenChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    setSelectedToken(e.target.value);
    setAmountToWithdraw("");
  };
  
  const handleMaxAmount = () => {
    setAmountToWithdraw(maxAmount);
  };
  
  const handleContinue = () => {
    setStep(2);
  };
  
  const handleWithdraw = async () => {
    setLoading(true);
    
    try {
      // Parse amount to wei (assuming ETH as the base unit)
      const withdrawAmountWei = BigInt(parseFloat(amountToWithdraw) * 10**18);
      
      writeContract({
        address: CONTRACT_ADDRESSES.DAILY_SAVINGS as `0x${string}`,
        abi: DailySavingsABI,
        functionName: 'withdrawDailySavings',
        args: [
          address,
          selectedToken as `0x${string}`,
          withdrawAmountWei
        ]
      });
    } catch (error) {
      console.error("Error withdrawing savings:", error);
      setLoading(false);
    }
  };
  
  // Helper to format token symbol
  const getTokenSymbol = (address: string) => {
    const token = tokens.find(t => t.address === address);
    return token ? token.symbol : "";
  };
  
  // Format hash for display
  const formatHash = (hash?: `0x${string}`) => {
    if (!hash) return "";
    return `${hash.substring(0, 6)}...${hash.substring(hash.length - 4)}`;
  };
  
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 backdrop-blur-sm z-50">
      <motion.div 
        className="bg-gray-900 border border-gray-800 rounded-xl w-full max-w-md shadow-xl"
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
      >
        {step === 1 && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Withdraw Savings</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Select Token
                </label>
                <select
                  value={selectedToken}
                  onChange={handleTokenChange}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                >
                  {tokens.map(token => (
                    <option key={token.address} value={token.address}>
                      {token.symbol} - {token.balance} available
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Amount to Withdraw
                </label>
                <div className="relative">
                  <input
                    type="number"
                    value={amountToWithdraw}
                    onChange={(e) => setAmountToWithdraw(e.target.value)}
                    placeholder="0.0"
                    step="0.001"
                    min="0.001"
                    max={maxAmount}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white pr-20"
                  />
                  <button
                    onClick={handleMaxAmount}
                    className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs bg-blue-900/50 hover:bg-blue-800 text-blue-300 px-2 py-1 rounded"
                  >
                    MAX
                  </button>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-gray-500">Available: {maxAmount} {getTokenSymbol(selectedToken)}</span>
                  {amountToWithdraw && parseFloat(amountToWithdraw) > parseFloat(maxAmount) && (
                    <span className="text-red-500">Exceeds available balance</span>
                  )}
                </div>
              </div>
            </div>
            
            <div className="mt-6">
              <button
                onClick={handleContinue}
                disabled={!amountToWithdraw || parseFloat(amountToWithdraw) <= 0 || parseFloat(amountToWithdraw) > parseFloat(maxAmount)}
                className={`w-full py-3 px-4 rounded-lg font-medium ${
                  !amountToWithdraw || parseFloat(amountToWithdraw) <= 0 || parseFloat(amountToWithdraw) > parseFloat(maxAmount)
                    ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-600 hover:bg-blue-500 text-white'
                }`}
              >
                Continue
              </button>
            </div>
          </div>
        )}
        
        {step === 2 && (
          <div className="p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-bold">Confirm Withdrawal</h2>
              <button onClick={onClose} className="text-gray-400 hover:text-white">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </button>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <div className="flex justify-between mb-2">
                <span className="text-gray-400">Amount to withdraw:</span>
                <span className="text-white font-medium">{amountToWithdraw} {getTokenSymbol(selectedToken)}</span>
              </div>
              
              {penalty > 0 && (
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Penalty ({penalty / amountToWithdraw * 100}%):</span>
                  <span className="text-red-500">-{penalty.toFixed(6)} {getTokenSymbol(selectedToken)}</span>
                </div>
              )}
              
              <div className="flex justify-between pt-2 border-t border-gray-700 mt-2">
                <span className="text-gray-400">You will receive:</span>
                <span className="text-white font-bold">{(parseFloat(amountToWithdraw) - penalty).toFixed(6)} {getTokenSymbol(selectedToken)}</span>
              </div>
            </div>
            
            {timelockEnd && (
              <div className="bg-yellow-900/20 border border-yellow-800 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-500 mt-0.5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12L15 15M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div className="text-yellow-500 font-medium">Timelock Active</div>
                    <div className="text-yellow-300 text-sm">
                      Your funds are time-locked until {timelockEnd.toLocaleDateString()} at {timelockEnd.toLocaleTimeString()}.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {penalty > 0 && (
              <div className="bg-red-900/20 border border-red-800 rounded-lg p-4 mb-4">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M12 8V12M12 16H12.01M22 12C22 17.5228 17.5228 22 12 22C6.47715 22 2 17.5228 2 12C2 6.47715 6.47715 2 12 2C17.5228 2 22 6.47715 22 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  <div>
                    <div className="text-red-500 font-medium">Early Withdrawal Penalty</div>
                    <div className="text-red-300 text-sm">
                      You haven't reached your savings goal yet. A penalty will be applied to this withdrawal.
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            <div className="mt-6 space-y-3">
              <button
                onClick={handleWithdraw}
                disabled={loading || isTxPending}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center justify-center"
              >
                {(loading || isTxPending) ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Processing withdrawal...
                  </>
                ) : (
                  'Confirm Withdrawal'
                )}
              </button>
              
              <button
                onClick={() => setStep(1)}
                className="w-full py-3 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
              >
                Back
              </button>
            </div>
          </div>
        )}
        
        {step === 3 && (
          <div className="p-6">
            <div className="flex flex-col items-center justify-center py-4">
              <div className="w-16 h-16 bg-green-900/30 rounded-full flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <path d="M5 13L9 17L19 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
              </div>
              
              <h2 className="text-xl font-bold mb-2">Withdrawal Successful!</h2>
              <p className="text-gray-400 text-center mb-6">
                You have successfully withdrawn {(parseFloat(amountToWithdraw) - penalty).toFixed(6)} {getTokenSymbol(selectedToken)}
              </p>
              
              <div className="w-full bg-gray-800 rounded-lg p-4 mb-6">
                <div className="flex justify-between mb-2">
                  <span className="text-gray-400">Transaction Hash:</span>
                  <a 
                    href={`https://sepolia.basescan.org/tx/${withdrawTxHash}`} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-400 underline cursor-pointer"
                  >
                    {formatHash(withdrawTxHash)}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Time:</span>
                  <span className="text-white">{new Date().toLocaleTimeString()}</span>
                </div>
              </div>
              
              <button
                onClick={onClose}
                className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg"
              >
                Close
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
} 