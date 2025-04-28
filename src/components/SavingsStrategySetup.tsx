"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { Address } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import SavingStrategyABI from "@/ABI/SavingStrategy.json";
import SpendSaveStorageABI from "@/ABI/SpenSaveStorage.json";

// Define SavingsTokenType enum to match contract
enum SavingsTokenType {
  OUTPUT = 0,
  INPUT = 1,
  SPECIFIC = 2
}

export default function SavingsStrategySetup({ onComplete }: { onComplete: () => void }) {
  const { address } = useAccount();
  const [strategy, setStrategy] = useState({
    percentage: 10,
    autoIncrement: 0.5,
    maxPercentage: 25,
    roundUpSavings: true,
    savingsTokenType: SavingsTokenType.OUTPUT,
    specificToken: CONTRACT_ADDRESSES.ETH,
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Get existing strategy if available
  const { data: existingStrategy } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE as Address,
    abi: SpendSaveStorageABI,
    functionName: 'getUserSavingStrategy',
    args: [address],
    enabled: !!address,
  });

  // Initialize strategy from existing data if available
  useEffect(() => {
    if (existingStrategy && existingStrategy.hasStrategy) {
      setStrategy({
        percentage: Number(existingStrategy.currentPercentage) / 100, // Convert from basis points (e.g., 1000 = 10%)
        autoIncrement: Number(existingStrategy.autoIncrement) / 100, 
        maxPercentage: Number(existingStrategy.maxPercentage) / 100,
        roundUpSavings: existingStrategy.roundUpSavings,
        savingsTokenType: existingStrategy.savingsTokenType,
        specificToken: existingStrategy.specificSavingsToken,
      });
    }
  }, [existingStrategy]);

  // Contract write hook
  const { data: hash, isPending, writeContract } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
  });

  // Handle status changes
  useEffect(() => {
    setLoading(isPending || isConfirming);
    if (isSuccess) {
      setSuccess(true);
      // Delay completion to show success state
      setTimeout(() => {
        onComplete();
      }, 1500);
    }
  }, [isPending, isConfirming, isSuccess, onComplete]);

  const handleSubmit = async () => {
    if (!address) return;
    
    try {
      // Convert percentage values to basis points for contract (e.g., 10% becomes 1000)
      const percentageBasisPoints = Math.round(strategy.percentage * 100);
      const autoIncrementBasisPoints = Math.round(strategy.autoIncrement * 100);
      const maxPercentageBasisPoints = Math.round(strategy.maxPercentage * 100);

      // Call contract to set saving strategy
      writeContract({
        address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE as Address,
        abi: SpendSaveStorageABI,
        functionName: 'setUserSavingStrategy',
        args: [
          address,
          percentageBasisPoints,
          autoIncrementBasisPoints,
          maxPercentageBasisPoints,
          0, // goalAmount - we don't set it here
          strategy.roundUpSavings,
          false, // enableDCA - we don't enable it here
          strategy.savingsTokenType,
          strategy.savingsTokenType === SavingsTokenType.SPECIFIC 
            ? strategy.specificToken
            : "0x0000000000000000000000000000000000000000" // Zero address if not specific token
        ]
      });
    } catch (error) {
      console.error("Error setting saving strategy:", error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Set Your Savings Strategy</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Save percentage of each swap
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="50"
              value={strategy.percentage}
              onChange={(e) => setStrategy({...strategy, percentage: parseInt(e.target.value)})}
              className="w-full"
            />
            <span className="ml-2 text-white font-medium w-12 text-right">{strategy.percentage}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">This percentage of each swap will be saved automatically</p>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="autoIncrement"
            checked={strategy.autoIncrement > 0}
            onChange={(e) => setStrategy({...strategy, autoIncrement: e.target.checked ? 0.5 : 0})}
            className="mr-2"
          />
          <label htmlFor="autoIncrement" className="text-sm text-gray-300">
            Automatically increase saving percentage over time
          </label>
        </div>
        
        {strategy.autoIncrement > 0 && (
          <div className="pl-6 border-l border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Increase by (per swap)
            </label>
            <div className="flex items-center">
              <input
                type="range"
                min="0.1"
                max="2"
                step="0.1"
                value={strategy.autoIncrement}
                onChange={(e) => setStrategy({...strategy, autoIncrement: parseFloat(e.target.value)})}
                className="w-full"
              />
              <span className="ml-2 text-white font-medium w-12 text-right">{strategy.autoIncrement}%</span>
            </div>
            
            <div className="mt-3">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Maximum percentage
              </label>
              <div className="flex items-center">
                <input
                  type="range"
                  min={strategy.percentage}
                  max="50"
                  value={strategy.maxPercentage}
                  onChange={(e) => setStrategy({...strategy, maxPercentage: parseInt(e.target.value)})}
                  className="w-full"
                />
                <span className="ml-2 text-white font-medium w-12 text-right">{strategy.maxPercentage}%</span>
              </div>
            </div>
          </div>
        )}
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Which token to save
          </label>
          <div className="grid grid-cols-3 gap-3">
            <div 
              className={`border ${strategy.savingsTokenType === SavingsTokenType.OUTPUT ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer text-center`}
              onClick={() => setStrategy({...strategy, savingsTokenType: SavingsTokenType.OUTPUT})}
            >
              <div className="text-sm font-medium">Output Token</div>
              <div className="text-xs text-gray-400 mt-1">Save part of what you receive</div>
            </div>
            <div 
              className={`border ${strategy.savingsTokenType === SavingsTokenType.INPUT ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer text-center`}
              onClick={() => setStrategy({...strategy, savingsTokenType: SavingsTokenType.INPUT})}
            >
              <div className="text-sm font-medium">Input Token</div>
              <div className="text-xs text-gray-400 mt-1">Save part of what you spend</div>
            </div>
            <div 
              className={`border ${strategy.savingsTokenType === SavingsTokenType.SPECIFIC ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer text-center`}
              onClick={() => setStrategy({...strategy, savingsTokenType: SavingsTokenType.SPECIFIC})}
            >
              <div className="text-sm font-medium">Specific Token</div>
              <div className="text-xs text-gray-400 mt-1">Always save in one token</div>
            </div>
          </div>
        </div>
        
        {strategy.savingsTokenType === SavingsTokenType.SPECIFIC && (
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Specific token to save
            </label>
            <select
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              value={strategy.specificToken}
              onChange={(e) => setStrategy({...strategy, specificToken: e.target.value as Address})}
            >
              <option value={CONTRACT_ADDRESSES.ETH}>ETH</option>
              <option value={CONTRACT_ADDRESSES.USDC}>USDC</option>
              <option value={CONTRACT_ADDRESSES.WETH}>WETH</option>
            </select>
          </div>
        )}
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="roundUp"
            checked={strategy.roundUpSavings}
            onChange={(e) => setStrategy({...strategy, roundUpSavings: e.target.checked})}
            className="mr-2"
          />
          <label htmlFor="roundUp" className="text-sm text-gray-300">
            Round up savings to nearest token unit
          </label>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button
          onClick={handleSubmit}
          disabled={loading || !address}
          className={`w-full py-3 px-4 ${success ? 'bg-green-600' : 'bg-blue-600 hover:bg-blue-500'} text-white font-medium rounded-lg flex items-center justify-center ${loading || !address ? 'opacity-60 cursor-not-allowed' : ''}`}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              {isConfirming ? 'Confirming transaction...' : 'Setting up your strategy...'}
            </>
          ) : success ? (
            <>
              <svg className="w-5 h-5 mr-2 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Strategy Saved!
            </>
          ) : (
            'Save Strategy'
          )}
        </button>
        
        {!address && (
          <p className="text-center text-yellow-500 text-sm mt-3">
            Please connect your wallet to set up your savings strategy.
          </p>
        )}
      </div>
    </div>
  );
} 