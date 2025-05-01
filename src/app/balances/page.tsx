'use client';

import React from 'react';
import TokenBalanceDisplay from '@/components/TokenBalanceDisplay';

export default function TokenBalancesPage() {
  return (
    <div className="container mx-auto max-w-3xl py-10 px-4">
      <h1 className="text-3xl font-bold mb-8 text-center">Wallet Token Balances</h1>
      <p className="text-gray-600 dark:text-gray-300 mb-8 text-center">
        View your ETH, WETH, USDC, and DAI balances on Base Sepolia.
      </p>
      
      <TokenBalanceDisplay />
      
      <div className="mt-8 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
        <h2 className="text-lg font-semibold mb-2">About Token Balances</h2>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          This page shows your token balances for selected tokens on Base Sepolia testnet. 
          Connect your wallet to see your balances updated in real-time. Click the refresh 
          button to manually update your balances after transactions.
        </p>
      </div>
    </div>
  );
} 