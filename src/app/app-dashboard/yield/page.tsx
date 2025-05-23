"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import { motion } from 'framer-motion';
import { FiTrendingUp, FiDollarSign, FiPieChart, FiActivity, FiArrowRight, FiArrowUp, FiMinus, FiPlus, FiRefreshCw, FiInfo } from 'react-icons/fi';
import Image from 'next/image';

// Define types
interface TokenInfo {
  symbol: string;
  amount: number;
  value: number;
}

interface DepositedAssets {
  token1: TokenInfo;
  token2?: TokenInfo;
  token3?: TokenInfo;
}

interface Rewards {
  token: string;
  amount: number;
  value: number;
}

type RiskLevel = 'Low' | 'Medium' | 'Medium-High' | 'High';

interface YieldPosition {
  id: number;
  protocol: string;
  poolName: string;
  deposited: DepositedAssets;
  totalValueLocked: number;
  apy: number;
  rewards: Rewards;
  earnedFees: number;
  platform: string;
  icon: string;
  color: string;
}

interface YieldOpportunity {
  id: number;
  protocol: string;
  poolName: string;
  apy: number;
  totalValueLocked: string;
  platform: string;
  risk: RiskLevel;
  icon: string;
  color: string;
}

export default function YieldDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('myPositions');
  const [sortBy, setSortBy] = useState('apy');
  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [selectedPool, setSelectedPool] = useState<YieldPosition | null>(null);

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  // Mock data for user's yield positions
  const userPositions: YieldPosition[] = [
    {
      id: 1,
      protocol: 'Uniswap V3',
      poolName: 'ETH-USDC',
      deposited: {
        token1: { symbol: 'ETH', amount: 0.75, value: 1875 },
        token2: { symbol: 'USDC', amount: 1875, value: 1875 }
      },
      totalValueLocked: 3750,
      apy: 21.4,
      rewards: {
        token: 'UNI',
        amount: 14.8,
        value: 148
      },
      earnedFees: 124,
      platform: 'Ethereum',
      icon: '/assets/uniswap.svg',
      color: '#FF007A'
    },
    {
      id: 2,
      protocol: 'Aave',
      poolName: 'USDT Lending',
      deposited: {
        token1: { symbol: 'USDT', amount: 2500, value: 2500 },
      },
      totalValueLocked: 2500,
      apy: 4.3,
      rewards: {
        token: 'AAVE',
        amount: 1.2,
        value: 96
      },
      earnedFees: 89,
      platform: 'Ethereum',
      icon: '/assets/aave.svg',
      color: '#B6509E'
    },
    {
      id: 3,
      protocol: 'Curve Finance',
      poolName: 'Tricrypto Pool',
      deposited: {
        token1: { symbol: 'BTC', amount: 0.05, value: 1500 },
        token2: { symbol: 'ETH', amount: 0.6, value: 1500 },
        token3: { symbol: 'USDT', amount: 1500, value: 1500 }
      },
      totalValueLocked: 4500,
      apy: 15.2,
      rewards: {
        token: 'CRV',
        amount: 52.8,
        value: 132
      },
      earnedFees: 217,
      platform: 'Ethereum',
      icon: '/assets/curve.svg',
      color: '#0020C0'
    }
  ];

  // Mock data for yield opportunities
  const yieldOpportunities: YieldOpportunity[] = [
    {
      id: 1,
      protocol: 'Compound',
      poolName: 'DAI Lending',
      apy: 4.8,
      totalValueLocked: '$47.5M',
      platform: 'Ethereum',
      risk: 'Low',
      icon: '/assets/compound.svg',
      color: '#00D395'
    },
    {
      id: 2,
      protocol: 'Balancer',
      poolName: 'ETH-BTC-USDC',
      apy: 18.9,
      totalValueLocked: '$35.2M',
      platform: 'Ethereum',
      risk: 'Medium',
      icon: '/assets/balancer.svg',
      color: '#25292E'
    },
    {
      id: 3,
      protocol: 'Raydium',
      poolName: 'SOL-USDC',
      apy: 24.6,
      totalValueLocked: '$21.8M',
      platform: 'Solana',
      risk: 'Medium-High',
      icon: '/assets/raydium.svg',
      color: '#2150FA'
    },
    {
      id: 4,
      protocol: 'Anchor',
      poolName: 'UST Deposit',
      apy: 19.5,
      totalValueLocked: '$8.4M',
      platform: 'Terra',
      risk: 'High',
      icon: '/assets/anchor.svg',
      color: '#5FCFD6'
    },
    {
      id: 5,
      protocol: 'SushiSwap',
      poolName: 'SUSHI-ETH',
      apy: 32.1,
      totalValueLocked: '$27.3M',
      platform: 'Ethereum',
      risk: 'Medium-High',
      icon: '/assets/sushiswap.svg',
      color: '#FA52A0'
    }
  ];

  // Sort yield opportunities based on selected sort option
  const sortedOpportunities = [...yieldOpportunities].sort((a, b) => {
    if (sortBy === 'apy') {
      return b.apy - a.apy;
    } else if (sortBy === 'tvl') {
      return parseFloat(b.totalValueLocked.replace('$', '').replace('M', '')) - 
             parseFloat(a.totalValueLocked.replace('$', '').replace('M', ''));
    } else if (sortBy === 'risk') {
      const riskOrder: Record<RiskLevel, number> = { 
        'Low': 1, 
        'Medium': 2, 
        'Medium-High': 3, 
        'High': 4 
      };
      return riskOrder[a.risk] - riskOrder[b.risk];
    }
    return 0;
  });

  // Calculate totals for the user's positions
  const totalDeposited = userPositions.reduce((sum, position) => sum + position.totalValueLocked, 0);
  const totalRewards = userPositions.reduce((sum, position) => sum + position.rewards.value + position.earnedFees, 0);
  const avgApy = userPositions.reduce((sum, position) => sum + position.apy, 0) / userPositions.length;

  // Get risk color
  const getRiskColor = (risk: RiskLevel): string => {
    switch (risk) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'Medium-High': return 'text-orange-400';
      case 'High': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold mb-6">Yield Farming</h1>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Total Value Deposited</p>
              <h2 className="text-2xl font-bold">${totalDeposited.toLocaleString()}</h2>
              <p className="text-sm text-green-400 mt-1 flex items-center">
                <FiPieChart className="mr-1" /> Across {userPositions.length} positions
              </p>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Total Rewards + Fees</p>
              <h2 className="text-2xl font-bold">${totalRewards.toLocaleString()}</h2>
              <p className="text-sm text-green-400 mt-1 flex items-center">
                <FiDollarSign className="mr-1" /> From both tokens and fees
              </p>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Average APY</p>
              <h2 className="text-2xl font-bold">{avgApy.toFixed(1)}%</h2>
              <p className="text-sm text-blue-400 mt-1 flex items-center">
                <FiTrendingUp className="mr-1" /> Weighted across all positions
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6 border-b border-gray-800 pb-2">
            <button
              onClick={() => setActiveTab('myPositions')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'myPositions' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              My Positions
            </button>
            <button
              onClick={() => setActiveTab('explore')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'explore' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Explore Opportunities
            </button>
          </div>

          {/* User positions tab */}
          {activeTab === 'myPositions' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">Your Yield Positions</h2>
                <button className="flex items-center space-x-1 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition">
                  <FiRefreshCw className="mr-1" /> Harvest All Rewards
                </button>
              </div>

              {userPositions.length === 0 ? (
                <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-8 text-center">
                  <div className="text-6xl mx-auto mb-3 text-gray-700">🌱</div>
                  <h3 className="text-xl font-medium mb-2">No Yield Positions Yet</h3>
                  <p className="text-gray-400 mb-6">Start earning passive income by depositing your assets into yield farms</p>
                  <button 
                    onClick={() => setActiveTab('explore')}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                  >
                    Explore Opportunities
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {userPositions.map((position) => (
                    <div key={position.id} className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
                      <div className="flex flex-col md:flex-row md:items-center">
                        <div className="flex items-center mb-4 md:mb-0 md:w-1/5">
                          <div 
                            className="mr-3 w-10 h-10 rounded-full flex items-center justify-center"
                            style={{ backgroundColor: `${position.color}20` }}
                          >
                            <div className="text-xl font-bold" style={{ color: position.color }}>
                              {position.protocol.charAt(0)}
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium">{position.protocol}</h3>
                            <p className="text-sm text-gray-400">{position.poolName}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:w-4/5">
                          <div>
                            <p className="text-sm text-gray-400">Deposited</p>
                            <p className="font-medium">${position.totalValueLocked.toLocaleString()}</p>
                            <div className="flex flex-wrap text-xs text-gray-500 mt-1">
                              {position.deposited.token1 && (
                                <span className="mr-2">{position.deposited.token1.amount} {position.deposited.token1.symbol}</span>
                              )}
                              {position.deposited.token2 && (
                                <span className="mr-2">{position.deposited.token2.amount} {position.deposited.token2.symbol}</span>
                              )}
                              {position.deposited.token3 && (
                                <span>{position.deposited.token3.amount} {position.deposited.token3.symbol}</span>
                              )}
                            </div>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">APY</p>
                            <p className="font-medium text-green-400">{position.apy}%</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">Rewards</p>
                            <p className="font-medium">
                              {position.rewards.amount} {position.rewards.token}
                              <span className="text-xs text-gray-400 ml-1">(${position.rewards.value})</span>
                            </p>
                            <p className="text-xs text-gray-400">
                              + ${position.earnedFees} in fees
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">Platform</p>
                            <p className="font-medium">{position.platform}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex mt-4 space-x-3 justify-end">
                        <button 
                          onClick={() => {
                            setSelectedPool(position);
                            setShowDepositModal(true);
                          }}
                          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition flex items-center"
                        >
                          <FiPlus className="mr-2" /> Deposit
                        </button>
                        <button 
                          onClick={() => {
                            setSelectedPool(position);
                            setShowWithdrawModal(true);
                          }}
                          className="px-4 py-2 bg-gray-800 text-gray-300 rounded-lg hover:bg-gray-700 transition flex items-center"
                        >
                          <FiMinus className="mr-2" /> Withdraw
                        </button>
                        <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                          Harvest
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Explore opportunities tab */}
          {activeTab === 'explore' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">Yield Farming Opportunities</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSortBy('apy')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      sortBy === 'apy' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    Highest APY
                  </button>
                  <button
                    onClick={() => setSortBy('tvl')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      sortBy === 'tvl' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    Highest TVL
                  </button>
                  <button
                    onClick={() => setSortBy('risk')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      sortBy === 'risk' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    Lowest Risk
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {sortedOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center mb-4">
                      <div 
                        className="mr-3 w-10 h-10 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${opportunity.color}20` }}
                      >
                        <div className="text-xl font-bold" style={{ color: opportunity.color }}>
                          {opportunity.protocol.charAt(0)}
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium">{opportunity.protocol}</h3>
                        <p className="text-sm text-gray-400">{opportunity.poolName}</p>
                      </div>
                      <div className="ml-auto">
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                          {opportunity.apy}% APY
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Platform</p>
                        <p className="font-medium">{opportunity.platform}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">TVL</p>
                        <p className="font-medium">{opportunity.totalValueLocked}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Risk Level</p>
                        <p className={`font-medium ${getRiskColor(opportunity.risk)}`}>
                          {opportunity.risk}
                        </p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center">
                        View Details <FiArrowRight className="ml-2" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-blue-900/30 border border-blue-800 rounded-xl p-4 flex items-start">
                <FiInfo className="text-blue-400 text-xl mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-400">Understanding Yield Farming Risks</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Yield farming involves various risks including smart contract vulnerabilities, impermanent loss,
                    and market volatility. Higher APYs usually come with higher risks. Always do your own research
                    before depositing funds.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>

      {/* Deposit Modal - In a real app this would be more complex */}
      {showDepositModal && selectedPool && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Deposit to {selectedPool.protocol} - {selectedPool.poolName}</h3>
            <p className="text-gray-400 mb-6">Current APY: {selectedPool.apy}%</p>
            
            <button 
              className="w-full bg-gray-800 text-gray-400 py-2 px-4 rounded-lg mb-4"
              onClick={() => setShowDepositModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Withdraw Modal - In a real app this would be more complex */}
      {showWithdrawModal && selectedPool && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md">
            <h3 className="text-xl font-bold mb-4">Withdraw from {selectedPool.protocol} - {selectedPool.poolName}</h3>
            <p className="text-gray-400 mb-6">You currently have ${selectedPool.totalValueLocked} deposited</p>
            
            <button 
              className="w-full bg-gray-800 text-gray-400 py-2 px-4 rounded-lg mb-4"
              onClick={() => setShowWithdrawModal(false)}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
} 