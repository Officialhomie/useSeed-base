'use client';

import React from 'react';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { SiEthereum } from "react-icons/si";
import { FaCoins } from "react-icons/fa";

const TokenIcons: { [key: string]: JSX.Element } = {
  'ETH': <SiEthereum className="w-5 h-5 text-blue-600" />,
  'WETH': <SiEthereum className="w-5 h-5 text-yellow-500" />,
  'USDC': <FaCoins className="w-5 h-5 text-green-600" />,
  'DAI': <FaCoins className="w-5 h-5 text-amber-500" />
};

export const TokenBalanceDisplay: React.FC = () => {
  const { tokenBalances, isLoading, isConnected, refreshBalances } = useTokenBalances();
  
  // Handle connection status
  if (!isConnected) {
    return (
      <div className="flex flex-col items-center justify-center p-6 bg-gray-50 dark:bg-gray-900 rounded-lg shadow-sm">
        <h2 className="text-xl font-bold mb-4">Your Token Balances</h2>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Connect your wallet to view your token balances</p>
        <ConnectButton />
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-sm">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Your Token Balances</h2>
        <button
          onClick={refreshBalances}
          className="py-1 px-3 text-sm bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          disabled={isLoading}
        >
          {isLoading ? 'Refreshing...' : 'Refresh'}
        </button>
      </div>

      {isLoading && Object.keys(tokenBalances).length === 0 ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <div className="space-y-4">
          {Object.values(tokenBalances).length > 0 ? (
            Object.values(tokenBalances).map((token) => (
              <div key={token.symbol} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="flex items-center">
                  <div className="mr-3">
                    {TokenIcons[token.symbol] || <FaCoins className="w-5 h-5 text-gray-500" />}
                  </div>
                  <div>
                    <p className="font-medium">{token.name}</p>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{token.symbol}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-medium">{token.formattedBalance}</p>
                  {token.symbol === 'USDC' && (
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      ${parseFloat(token.formattedBalance).toFixed(2)}
                    </p>
                  )}
                </div>
              </div>
            ))
          ) : (
            <p className="text-center py-4 text-gray-500 dark:text-gray-400">
              No token balances found for this wallet
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default TokenBalanceDisplay; 