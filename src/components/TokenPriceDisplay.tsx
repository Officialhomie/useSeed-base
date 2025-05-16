"use client";

import React from 'react';
import { useTokenPrices } from '@/lib/hooks/useTokenPrices';
import { FiRefreshCw, FiWifi, FiWifiOff, FiInfo } from 'react-icons/fi';

export function TokenPriceDisplay() {
  const { prices, apiStatus, isLoading, refetch } = useTokenPrices();

  // Function to format price with commas and 2 decimal places
  const formatPrice = (price: number): string => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(price);
  };

  // Get status color based on token price status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'success': return 'text-green-400';
      case 'fallback': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      case 'stable': return 'text-blue-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl shadow-lg p-4 border border-gray-800 mb-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-lg font-medium text-white">Current Token Prices</h3>
        <button 
          onClick={() => refetch()}
          disabled={isLoading}
          className={`p-2 rounded-full ${isLoading ? 'bg-gray-800 text-gray-600' : 'bg-gray-800 hover:bg-gray-700 text-gray-400 hover:text-white'} transition-colors`}
          title="Refresh prices"
        >
          <FiRefreshCw className={`${isLoading ? 'animate-spin' : ''}`} size={16} />
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3">
        {Object.entries(prices).map(([symbol, data]) => (
          <div key={symbol} className="bg-gray-800/50 rounded-lg p-3 flex flex-col">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-400">{symbol}</span>
              <span className={`text-xs ${getStatusColor(data.status)}`}>
                {data.status === 'loading' ? 'Loading...' : 
                 data.status === 'fallback' ? 'Fallback' : 
                 data.status === 'error' ? 'Error' : 
                 data.status === 'stable' ? 'Stable' : 'Live'}
              </span>
            </div>
            <span className="text-lg font-bold text-white mt-1">
              {data.status === 'loading' ? 
                <div className="h-6 w-16 bg-gray-700 rounded animate-pulse"></div> : 
                formatPrice(data.price)
              }
            </span>
          </div>
        ))}
      </div>

      {/* API Status */}
      <div className="border-t border-gray-800 pt-3 flex items-start text-xs">
        <div className="mr-2 mt-0.5">
          {apiStatus.isOperational ? 
            <FiWifi className="text-green-400" /> : 
            <FiWifiOff className="text-red-400" />
          }
        </div>
        <div>
          <div className="text-gray-400 flex items-center">
            BaseScan API: <span className={`ml-1 ${apiStatus.isOperational ? 'text-green-400' : 'text-red-400'}`}>
              {apiStatus.isOperational ? 'Operational' : 'Outage'}
            </span>
            {apiStatus.fallbackUsed && (
              <span className="ml-2 text-yellow-400 flex items-center">
                <FiInfo className="mr-1" size={12} />
                Using fallback prices
              </span>
            )}
          </div>
          <div className="text-gray-500 mt-1">
            Last updated: {apiStatus.lastUpdated.toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
} 