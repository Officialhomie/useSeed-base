"use client";

import { useState, useEffect } from 'react';
import { useGasPrice, GasPriceCategory } from '@/lib/hooks/useGasPrice';
import { cn } from '@/lib/utils';

interface GasPriceSelectorProps {
  gasLimit: number;
  onGasPriceSelect?: (category: GasPriceCategory, gasPrice: number) => void;
  className?: string;
  showFeeBreakdown?: boolean;
}

export default function GasPriceSelector({
  gasLimit,
  onGasPriceSelect,
  className,
  showFeeBreakdown = true,
}: GasPriceSelectorProps) {
  const {
    gasPrices,
    feeEstimate,
    selectedCategory,
    isLoading,
    error,
    setSelectedCategory,
    setGasLimit,
    refetch
  } = useGasPrice({
    autoFetch: true,
    autoEstimate: true,
    gasLimit,
    refreshInterval: null, // Only refresh on demand
  });

  // Update gas limit when prop changes
  useEffect(() => {
    setGasLimit(gasLimit);
  }, [gasLimit, setGasLimit]);

  // Call the callback when selection changes
  useEffect(() => {
    if (gasPrices && onGasPriceSelect) {
      const price = selectedCategory === 'safe' 
        ? gasPrices.safe 
        : selectedCategory === 'fast' 
          ? gasPrices.fast 
          : gasPrices.standard;
      
      onGasPriceSelect(selectedCategory, price);
    }
  }, [selectedCategory, gasPrices, onGasPriceSelect]);

  const handleSelectCategory = (category: GasPriceCategory) => {
    setSelectedCategory(category);
  };

  return (
    <div className={cn("rounded-lg border border-gray-800 bg-gray-900/60 p-4", className)}>
      <div className="mb-3 flex justify-between items-center">
        <h3 className="text-sm font-medium text-white">Gas Price</h3>
        <button
          onClick={() => refetch()}
          className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center"
        >
          <svg 
            className={`w-3 h-3 mr-1 ${isLoading ? 'animate-spin' : ''}`} 
            fill="none" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          Refresh
        </button>
      </div>

      {error && (
        <div className="mb-3 px-3 py-2 bg-red-900/20 border border-red-800/30 rounded text-xs text-red-400">
          Error fetching gas prices. Using fallback values.
        </div>
      )}

      {/* Gas price options */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => handleSelectCategory('safe')}
          className={cn(
            "flex flex-col items-center justify-center rounded-md p-2 border transition-colors",
            selectedCategory === 'safe'
              ? "bg-green-900/30 border-green-700/50 text-green-400"
              : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
          )}
        >
          <span className="text-xs font-medium">Safe</span>
          <span className="text-sm font-bold mt-1">
            {isLoading ? "..." : gasPrices?.safe || "5"} Gwei
          </span>
          <span className="text-xs mt-1">
            {feeEstimate && selectedCategory === 'safe' ? `$${feeEstimate.feeUsd}` : ''}
          </span>
        </button>

        <button
          onClick={() => handleSelectCategory('standard')}
          className={cn(
            "flex flex-col items-center justify-center rounded-md p-2 border transition-colors",
            selectedCategory === 'standard'
              ? "bg-blue-900/30 border-blue-700/50 text-blue-400"
              : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
          )}
        >
          <span className="text-xs font-medium">Standard</span>
          <span className="text-sm font-bold mt-1">
            {isLoading ? "..." : gasPrices?.standard || "7"} Gwei
          </span>
          <span className="text-xs mt-1">
            {feeEstimate && selectedCategory === 'standard' ? `$${feeEstimate.feeUsd}` : ''}
          </span>
        </button>

        <button
          onClick={() => handleSelectCategory('fast')}
          className={cn(
            "flex flex-col items-center justify-center rounded-md p-2 border transition-colors",
            selectedCategory === 'fast'
              ? "bg-purple-900/30 border-purple-700/50 text-purple-400"
              : "bg-gray-800/50 border-gray-700/50 text-gray-400 hover:bg-gray-800"
          )}
        >
          <span className="text-xs font-medium">Fast</span>
          <span className="text-sm font-bold mt-1">
            {isLoading ? "..." : gasPrices?.fast || "10"} Gwei
          </span>
          <span className="text-xs mt-1">
            {feeEstimate && selectedCategory === 'fast' ? `$${feeEstimate.feeUsd}` : ''}
          </span>
        </button>
      </div>

      {/* Fee breakdown */}
      {showFeeBreakdown && feeEstimate && (
        <div className="mt-4 p-3 bg-gray-800/50 rounded-md">
          <div className="text-xs text-gray-400 mb-2">Transaction Fee Breakdown</div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="text-gray-400">Gas Limit:</div>
            <div className="text-white text-right">{feeEstimate.gasLimit} units</div>
            
            <div className="text-gray-400">Gas Price:</div>
            <div className="text-white text-right">{feeEstimate.gasPrice} Gwei</div>
            
            <div className="text-gray-400">Fee:</div>
            <div className="text-white text-right">{feeEstimate.feeEth} ETH</div>
            
            <div className="text-gray-400">Fee in USD:</div>
            <div className="text-white text-right">${feeEstimate.feeUsd}</div>
            
            <div className="text-gray-400">ETH Price:</div>
            <div className="text-white text-right">${feeEstimate.ethUsdPrice}</div>

            <div className="text-gray-400">Data Source:</div>
            <div className="text-white text-right capitalize">
              {gasPrices?.source || 'Loading...'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 