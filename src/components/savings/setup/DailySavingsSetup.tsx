"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import DailySavingsABI from "@/ABI/DailySavings.json";

export default function DailySavingsSetup({ onComplete }: { onComplete: () => void }) {
  const { address } = useAccount();
  const [config, setConfig] = useState({
    token: CONTRACT_ADDRESSES.ETH,
    dailyAmount: "0.01",
    goalAmount: "1.0",
    penaltyBps: 500, // 5%
    endDate: "", // ISO date string
  });
  const [loading, setLoading] = useState(false);
  
  // Calculate days to goal
  const daysToGoal = config.dailyAmount && config.goalAmount
    ? Math.ceil(parseFloat(config.goalAmount) / parseFloat(config.dailyAmount))
    : 0;
  
  // Set default end date to 3 months from now
  useEffect(() => {
    const date = new Date();
    date.setMonth(date.getMonth() + 3);
    setConfig({...config, endDate: date.toISOString().split('T')[0]});
  }, []);

  // Contract write hook
  const { writeContract, data: txHash } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isTxPending, isSuccess: isTxSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });
  
  // Handle successful transaction
  useEffect(() => {
    if (isTxSuccess) {
      setLoading(false);
      onComplete();
    }
  }, [isTxSuccess, onComplete]);
  
  const handleSubmit = async () => {
    setLoading(true);
    
    try {
      // Calculate Unix timestamp for end date
      const endTime = new Date(config.endDate).getTime() / 1000; // Convert to UNIX timestamp
      
      // Parse amounts to wei (assuming ETH as the base unit)
      const dailyAmountWei = BigInt(parseFloat(config.dailyAmount) * 10**18);
      const goalAmountWei = BigInt(parseFloat(config.goalAmount) * 10**18);
      
      writeContract({
        address: CONTRACT_ADDRESSES.DAILY_SAVINGS as `0x${string}`,
        abi: DailySavingsABI,
        functionName: 'configureDailySavings',
        args: [
          address,
          config.token,
          dailyAmountWei,
          goalAmountWei,
          BigInt(config.penaltyBps),
          BigInt(endTime)
        ]
      });
    } catch (error) {
      console.error("Error setting up daily savings:", error);
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">Setup Daily Savings</h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Token to Save
          </label>
          <select
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
            value={config.token}
            onChange={(e) => setConfig({...config, token: e.target.value as `0x${string}`})}
          >
            <option value={CONTRACT_ADDRESSES.ETH}>ETH</option>
            <option value={CONTRACT_ADDRESSES.USDC}>USDC</option>
            <option value={CONTRACT_ADDRESSES.WETH}>WETH</option>
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Daily Amount
          </label>
          <div className="flex">
            <input
              type="number"
              value={config.dailyAmount}
              onChange={(e) => setConfig({...config, dailyAmount: e.target.value})}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              step="0.001"
              min="0.001"
            />
            <div className="ml-2 bg-gray-700 px-3 py-2 rounded-lg flex items-center">
              ETH
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Amount to save each day</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Savings Goal
          </label>
          <div className="flex">
            <input
              type="number"
              value={config.goalAmount}
              onChange={(e) => setConfig({...config, goalAmount: e.target.value})}
              className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
              step="0.01"
              min="0.01"
            />
            <div className="ml-2 bg-gray-700 px-3 py-2 rounded-lg flex items-center">
              ETH
            </div>
          </div>
          <p className="text-xs text-gray-500 mt-1">Target amount to save (optional)</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Early Withdrawal Penalty
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="0"
              max="3000"
              step="100"
              value={config.penaltyBps}
              onChange={(e) => setConfig({...config, penaltyBps: parseInt(e.target.value)})}
              className="w-full"
            />
            <span className="ml-2 text-white font-medium w-12 text-right">{config.penaltyBps / 100}%</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">Penalty applied for withdrawals before goal is reached</p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            End Date (Optional)
          </label>
          <input
            type="date"
            value={config.endDate}
            onChange={(e) => setConfig({...config, endDate: e.target.value})}
            className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
          />
          <p className="text-xs text-gray-500 mt-1">Target date to reach your goal</p>
        </div>
        
        <div className="bg-blue-900/20 border border-blue-700 rounded-lg p-4 mt-4">
          <div className="flex items-center text-blue-500 mb-2">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M13 16H12V12H11M12 8H12.01M21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="font-medium">Daily Savings Summary</span>
          </div>
          <div className="text-sm text-blue-300">
            <div>You will save <span className="font-bold">{config.dailyAmount} ETH</span> daily</div>
            <div>You'll reach <span className="font-bold">{config.goalAmount} ETH</span> in approximately <span className="font-bold">{daysToGoal} days</span></div>
            <div>Early withdrawal penalty: <span className="font-bold">{config.penaltyBps / 100}%</span></div>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-800">
        <button
          onClick={handleSubmit}
          disabled={loading || isTxPending}
          className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center justify-center"
        >
          {(loading || isTxPending) ? (
            <>
              <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Setting up daily savings...
            </>
          ) : (
            'Set Up Daily Savings'
          )}
        </button>
      </div>
    </div>
  );
} 