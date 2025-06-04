"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import { useAccount, useBalance } from 'wagmi';
import { Address } from 'viem';

// Investment Strategy Card Component
const InvestmentStrategyCard = ({ 
  title, 
  description, 
  apy, 
  invested, 
  token, 
  riskLevel 
}: { 
  title: string; 
  description: string; 
  apy: string; 
  invested: string; 
  token: string; 
  riskLevel: 'low' | 'medium' | 'high';
}) => {
  const riskColors = {
    low: 'bg-green-500/20 text-green-500 border-green-500/30',
    medium: 'bg-yellow-500/20 text-yellow-500 border-yellow-500/30',
    high: 'bg-red-500/20 text-red-500 border-red-500/30',
  };

  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 hover:border-gray-700 transition-colors">
      <div className="flex justify-between items-start">
        <h3 className="text-lg font-semibold text-white">{title}</h3>
        <div className={`px-2 py-1 rounded text-xs font-medium ${riskColors[riskLevel]}`}>
          {riskLevel.charAt(0).toUpperCase() + riskLevel.slice(1)} Risk
        </div>
      </div>
      <p className="text-gray-400 text-sm mt-2">{description}</p>
      
      <div className="mt-4 grid grid-cols-2 gap-3">
        <div className="bg-gray-800/60 rounded-lg p-3">
          <p className="text-sm text-gray-400">APY</p>
          <p className="text-lg font-semibold text-white">{apy}</p>
        </div>
        <div className="bg-gray-800/60 rounded-lg p-3">
          <p className="text-sm text-gray-400">Invested</p>
          <p className="text-lg font-semibold text-white">{invested} {token}</p>
        </div>
      </div>
      
      <div className="mt-4 flex space-x-2">
        <button className="flex-1 bg-blue-600/20 text-blue-500 border border-blue-500/30 hover:bg-blue-600/30 py-2 rounded-lg font-medium transition-colors">
          Deposit
        </button>
        <button className="flex-1 bg-gray-800 hover:bg-gray-700 text-white py-2 rounded-lg font-medium transition-colors">
          Withdraw
        </button>
      </div>
    </div>
  );
};

export default function InvestmentsDashboard() {
  const [mounted, setMounted] = useState(false);
  const { address } = useAccount();
  const { data: ethBalance } = useBalance({
    address: address as Address | undefined,
  });

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  // Example investments
  const investments = [
    {
      id: 1,
      title: "Stable Yield Strategy",
      description: "USDC lending on Compound with conservative parameters",
      apy: "3.7%",
      invested: "1000",
      token: "USDC",
      riskLevel: "low" as const
    },
    {
      id: 2,
      title: "ETH Liquidity Pool",
      description: "ETH-USDC liquidity provision on Uniswap V3",
      apy: "6.2%",
      invested: "0.8",
      token: "ETH",
      riskLevel: "medium" as const
    },
    {
      id: 3,
      title: "Leveraged Yield Farming",
      description: "Leveraged yield farming strategy with automatic rebalancing",
      apy: "12.5%",
      invested: "500",
      token: "USDC",
      riskLevel: "high" as const
    },
  ];

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Investment Strategies</h1>
          <button className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-medium flex items-center">
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Strategy
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {investments.map(investment => (
            <InvestmentStrategyCard 
              key={investment.id}
              title={investment.title}
              description={investment.description}
              apy={investment.apy}
              invested={investment.invested}
              token={investment.token}
              riskLevel={investment.riskLevel}
            />
          ))}
          
          {/* Add Strategy Card */}
          <div className="bg-gray-900/30 border border-gray-800 border-dashed rounded-xl p-6 flex flex-col items-center justify-center hover:bg-gray-900/50 transition-colors cursor-pointer">
            <div className="w-12 h-12 rounded-full bg-blue-600/20 flex items-center justify-center mb-3">
              <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-lg font-semibold text-white">Create New Strategy</h3>
            <p className="text-gray-400 text-sm text-center mt-2">
              Set up a new investment strategy tailored to your risk profile
            </p>
          </div>
        </div>
      </main>
    </DashboardLayout>
  );
} 