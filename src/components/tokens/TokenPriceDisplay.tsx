"use client";

import React, { useEffect } from 'react';
import { useTokenPrices } from '@/lib/hooks/useTokenPrices';
import { FiRefreshCw, FiWifi, FiWifiOff, FiInfo, FiAlertTriangle } from 'react-icons/fi';

export function TokenPriceDisplay() {
  const { prices, apiStatus, isLoading, refetch, error } = useTokenPrices(30000); // Update every 30 seconds

  // Automatic refresh on page focus
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        refetch();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [refetch]);

  // Function to format price with appropriate precision
  const formatPrice = (price: number): string => {
    // Large price numbers get 2 decimal places 
    if (price >= 100) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(price);
    } 
    // Small price numbers (less than $1) get 6 decimal places
    else if (price < 1) {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 6,
        maximumFractionDigits: 6
      }).format(price);
    }
    // Medium price numbers get 4 decimal places
    else {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 4,
        maximumFractionDigits: 4
      }).format(price);
    }
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
        <div className="flex items-center">
          <h3 className="text-lg font-medium text-white">Market Prices</h3>
          {isLoading && (
            <div className="ml-2 h-1.5 w-1.5 rounded-full bg-blue-500 animate-ping"></div>
          )}
        </div>
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
          <div key={symbol} className={`bg-gray-800/50 rounded-lg p-3 flex flex-col ${data.status === 'loading' ? 'animate-pulse' : ''}`}>
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-400">{symbol}</span>
              <span className={`text-xs px-1.5 py-0.5 rounded ${
                data.status === 'loading' ? 'bg-gray-700 text-gray-300' : 
                data.status === 'fallback' ? 'bg-yellow-900/30 text-yellow-400' : 
                data.status === 'error' ? 'bg-red-900/30 text-red-400' : 
                data.status === 'stable' ? 'bg-blue-900/30 text-blue-400' : 
                'bg-green-900/30 text-green-400'
              }`}>
                {data.status === 'loading' ? 'Loading...' : 
                 data.status === 'fallback' ? 'Fallback' : 
                 data.status === 'error' ? 'Error' : 
                 data.status === 'stable' ? 'Stable' : 'Live'}
              </span>
            </div>
            <span className="text-xl font-bold text-white mt-1">
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
        <div className="flex-1">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <span className="text-gray-400">BaseScan API:</span>
              <span className={`ml-1 ${apiStatus.isOperational ? 'text-green-400' : 'text-red-400'}`}>
                {apiStatus.isOperational ? 'Operational' : 'Outage'}
              </span>
            </div>
            <div className="text-gray-500">
              Updated: {apiStatus.lastUpdated.toLocaleTimeString()}
            </div>
          </div>
          
          {apiStatus.fallbackUsed && (
            <div className="mt-1 text-yellow-400 flex items-center">
              <FiAlertTriangle className="mr-1" size={12} />
              <span>Using fallback prices. Check API configuration.</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
} 