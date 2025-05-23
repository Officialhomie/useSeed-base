"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from "wagmi";
import DCAABI from "@/abi/trading/DCA.json";

export default function DCATickStrategy({ onSave, onCancel }: { onSave: (data: any) => void, onCancel: () => void }) {
  const { address } = useAccount();
  const [strategy, setStrategy] = useState({
    tickDelta: 50,
    tickExpiryTime: 24, // hours
    onlyImprovePrice: true,
    minTickImprovement: 10,
    dynamicSizing: false,
    customSlippageTolerance: 0.5
  });
  const [loading, setLoading] = useState(false);
  
  // Contract address for the DCA module
  const DCA_CONTRACT_ADDRESS = "0x123..."; // Replace with actual contract address
  
  // Read current DCA tick strategy for user
  const { data: currentStrategy } = useReadContract({
    address: DCA_CONTRACT_ADDRESS as `0x${string}`,
    abi: DCAABI,
    functionName: 'getDCATickStrategy',
    args: [address],
  });
  
  // Write contract hook for setting DCA tick strategy
  const { writeContract, data: updateTxHash } = useWriteContract();
  
  // Wait for transaction receipt
  const { isLoading: isUpdatePending, isSuccess: isUpdateSuccess } = useWaitForTransactionReceipt({
    hash: updateTxHash,
  });
  
  // Update UI when contract data is fetched
  useEffect(() => {
    if (currentStrategy && typeof currentStrategy === 'object') {
      const strategy = currentStrategy as Record<string, any>;
      setStrategy({
        tickDelta: Number(strategy.tickDelta || 50),
        // Convert seconds to hours for display
        tickExpiryTime: Number(strategy.tickExpiryTime || 86400) / 3600,
        onlyImprovePrice: Boolean(strategy.onlyImprovePrice),
        minTickImprovement: Number(strategy.minTickImprovement || 10),
        dynamicSizing: Boolean(strategy.dynamicSizing),
        customSlippageTolerance: 0.5 // This might be read from a different contract
      });
    }
  }, [currentStrategy]);
  
  const handleSave = () => {
    setLoading(true);
    
    try {
      // Convert values to correct format for contract
      const tickExpirySeconds = strategy.tickExpiryTime * 60 * 60;
      
      writeContract({
        address: DCA_CONTRACT_ADDRESS as `0x${string}`,
        abi: DCAABI,
        functionName: 'setDCATickStrategy',
        args: [
          address,
          strategy.tickDelta,
          tickExpirySeconds,
          strategy.onlyImprovePrice,
          strategy.minTickImprovement,
          strategy.dynamicSizing
        ]
      });
    } catch (error) {
      console.error("Error saving DCA tick strategy:", error);
      setLoading(false);
    }
  };
  
  // Handle successful transaction
  useEffect(() => {
    if (isUpdateSuccess) {
      setLoading(false);
      const tickExpirySeconds = strategy.tickExpiryTime * 60 * 60;
      onSave({
        ...strategy,
        tickExpiryTime: tickExpirySeconds
      });
    }
  }, [isUpdateSuccess, onSave, strategy]);
  
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
      <h2 className="text-xl font-bold mb-4">DCA Tick Strategy</h2>
      <p className="text-sm text-gray-400 mb-4">Configure your Dollar-Cost Averaging execution strategy based on price movements</p>
      
      <div className="space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Tick Delta (Price Difference)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="0"
              max="200"
              value={strategy.tickDelta}
              onChange={(e) => setStrategy({...strategy, tickDelta: parseInt(e.target.value)})}
              className="w-full"
            />
            <span className="ml-2 text-white font-medium w-12 text-right">{strategy.tickDelta}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Wait for price to move this many ticks before executing DCA (0 = execute immediately)
          </p>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Maximum Waiting Time (Hours)
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="1"
              max="168"
              value={strategy.tickExpiryTime}
              onChange={(e) => setStrategy({...strategy, tickExpiryTime: parseInt(e.target.value)})}
              className="w-full"
            />
            <span className="ml-2 text-white font-medium w-12 text-right">{strategy.tickExpiryTime}</span>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Execute DCA after this many hours regardless of price (168 = 1 week)
          </p>
        </div>
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="onlyImprovePrice"
            checked={strategy.onlyImprovePrice}
            onChange={(e) => setStrategy({...strategy, onlyImprovePrice: e.target.checked})}
            className="mr-2"
          />
          <label htmlFor="onlyImprovePrice" className="text-sm text-gray-300">
            Only execute when price improves
          </label>
        </div>
        
        {strategy.onlyImprovePrice && (
          <div className="pl-6 border-l border-gray-800">
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Minimum Tick Improvement
            </label>
            <div className="flex items-center">
              <input
                type="range"
                min="1"
                max="50"
                value={strategy.minTickImprovement}
                onChange={(e) => setStrategy({...strategy, minTickImprovement: parseInt(e.target.value)})}
                className="w-full"
              />
              <span className="ml-2 text-white font-medium w-12 text-right">{strategy.minTickImprovement}</span>
            </div>
          </div>
        )}
        
        <div className="flex items-center">
          <input
            type="checkbox"
            id="dynamicSizing"
            checked={strategy.dynamicSizing}
            onChange={(e) => setStrategy({...strategy, dynamicSizing: e.target.checked})}
            className="mr-2"
          />
          <label htmlFor="dynamicSizing" className="text-sm text-gray-300">
            Enable dynamic sizing based on price movement
          </label>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-400 mb-2">
            Custom Slippage Tolerance
          </label>
          <div className="flex items-center">
            <input
              type="range"
              min="0.1"
              max="5"
              step="0.1"
              value={strategy.customSlippageTolerance}
              onChange={(e) => setStrategy({...strategy, customSlippageTolerance: parseFloat(e.target.value)})}
              className="w-full"
            />
            <span className="ml-2 text-white font-medium w-12 text-right">{strategy.customSlippageTolerance}%</span>
          </div>
        </div>
      </div>
      
      <div className="mt-6 pt-6 border-t border-gray-800 flex justify-between">
        <button
          onClick={onCancel}
          className="py-2 px-4 bg-gray-800 hover:bg-gray-700 text-white rounded-lg"
        >
          Cancel
        </button>
        
        <button
          onClick={handleSave}
          disabled={loading || isUpdatePending}
          className="py-2 px-4 bg-blue-600 hover:bg-blue-500 text-white font-medium rounded-lg flex items-center"
        >
          {(loading || isUpdatePending) ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Saving...
            </>
          ) : (
            'Save Strategy'
          )}
        </button>
      </div>
    </div>
  );
} 