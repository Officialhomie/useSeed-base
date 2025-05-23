"use client";

import React, { useState } from 'react';
import GasPriceSelector from './GasPriceSelector';
import { GasPriceCategory } from '@/lib/hooks/useGasPrice';

interface SwapWithSavingsGasInfoProps {
  gasLimit: number;
  className?: string;
  onGasPriceSelect?: (category: GasPriceCategory, gasPrice: number) => void;
}

export default function SwapWithSavingsGasInfo({
  gasLimit,
  className,
  onGasPriceSelect
}: SwapWithSavingsGasInfoProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`border border-gray-800 rounded-lg overflow-hidden ${className || ''}`}>
      <div 
        className="flex justify-between items-center p-3 bg-gray-900/60 text-gray-300 cursor-pointer hover:bg-gray-900/80 transition-colors"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
          <span className="text-sm">Gas Settings</span>
        </div>
        <svg 
          className={`w-4 h-4 transition-transform ${expanded ? 'transform rotate-180' : ''}`}
          fill="none" 
          viewBox="0 0 24 24" 
          stroke="currentColor"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </div>

      {expanded && (
        <div className="p-3 bg-gray-900/30">
          <div className="text-xs text-gray-500 mb-3">
            Select gas price option to optimize for speed vs. cost
          </div>
          
          <GasPriceSelector 
            gasLimit={gasLimit} 
            onGasPriceSelect={onGasPriceSelect}
          />
          
          <div className="mt-4 text-xs text-gray-500">
            <p>Gas prices are fetched in real-time from BaseScan API and reflect current network conditions.</p>
            <p className="mt-2">Estimated fees include a small buffer to ensure transaction success.</p>
          </div>
        </div>
      )}
    </div>
  );
} 