"use client";

import { useState, useEffect } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import { motion } from 'framer-motion';
import { FiArrowUpRight, FiClock, FiLock, FiUnlock, FiCodesandbox, FiAward, FiAlertCircle, FiInfo } from 'react-icons/fi';
import Image from 'next/image';

export default function StakingDashboard() {
  const [mounted, setMounted] = useState(false);
  const [activeTab, setActiveTab] = useState('myStakes');
  const [filterStatus, setFilterStatus] = useState('all');

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return <div className="loading-container">Loading...</div>;

  // Mock data for staking positions
  const stakingPositions = [
    {
      id: 1,
      asset: 'Ethereum',
      symbol: 'ETH',
      amount: 1.42,
      amountUSD: 3560,
      apr: 4.5,
      rewards: 0.064,
      rewardsUSD: 160,
      lockPeriod: '90 days',
      timeRemaining: '43 days',
      status: 'locked',
      icon: '/assets/ethereum.svg',
    },
    {
      id: 2,
      asset: 'Solana',
      symbol: 'SOL',
      amount: 45.8,
      amountUSD: 4235,
      apr: 6.2,
      rewards: 2.84,
      rewardsUSD: 262,
      lockPeriod: '30 days',
      timeRemaining: '12 days',
      status: 'locked',
      icon: '/assets/solana.svg',
    },
    {
      id: 3,
      asset: 'Polkadot',
      symbol: 'DOT',
      amount: 320,
      amountUSD: 1920,
      apr: 9.8,
      rewards: 31.36,
      rewardsUSD: 188,
      lockPeriod: '60 days',
      timeRemaining: '0 days',
      status: 'unlocked',
      icon: '/assets/polkadot.svg',
    },
  ];

  // Mock data for staking opportunities
  const stakingOpportunities = [
    {
      id: 1,
      asset: 'Ethereum',
      symbol: 'ETH',
      apr: 5.2,
      lockPeriod: '90 days',
      minAmount: 0.5,
      tvl: '$24.5M',
      icon: '/assets/ethereum.svg',
    },
    {
      id: 2,
      asset: 'Solana',
      symbol: 'SOL',
      apr: 7.8,
      lockPeriod: '60 days',
      minAmount: 10,
      tvl: '$18.2M',
      icon: '/assets/solana.svg',
    },
    {
      id: 3,
      asset: 'Polkadot',
      symbol: 'DOT',
      apr: 11.2,
      lockPeriod: '30 days',
      minAmount: 50,
      tvl: '$9.1M',
      icon: '/assets/polkadot.svg',
    },
    {
      id: 4,
      asset: 'Cardano',
      symbol: 'ADA',
      apr: 8.4,
      lockPeriod: '60 days',
      minAmount: 100,
      tvl: '$12.8M',
      icon: '/assets/cardano.svg',
    },
    {
      id: 5,
      asset: 'Avalanche',
      symbol: 'AVAX',
      apr: 9.1,
      lockPeriod: '30 days',
      minAmount: 5,
      tvl: '$14.5M',
      icon: '/assets/avalanche.svg',
    },
  ];

  const filteredPositions = stakingPositions.filter(position => {
    if (filterStatus === 'all') return true;
    return position.status === filterStatus;
  });

  // Calculate total values
  const totalStaked = stakingPositions.reduce((sum, position) => sum + position.amountUSD, 0);
  const totalRewards = stakingPositions.reduce((sum, position) => sum + position.rewardsUSD, 0);
  const avgApr = stakingPositions.reduce((sum, position) => sum + position.apr, 0) / stakingPositions.length;

  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <motion.div
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h1 className="text-2xl font-bold mb-6">Staking</h1>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Total Staked Value</p>
              <h2 className="text-2xl font-bold">${totalStaked.toLocaleString()}</h2>
              <p className="text-sm text-green-400 mt-1 flex items-center">
                <FiArrowUpRight className="mr-1" /> Across {stakingPositions.length} assets
              </p>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Total Rewards Earned</p>
              <h2 className="text-2xl font-bold">${totalRewards.toLocaleString()}</h2>
              <p className="text-sm text-green-400 mt-1 flex items-center">
                <FiArrowUpRight className="mr-1" /> Average APR {avgApr.toFixed(1)}%
              </p>
            </div>

            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
              <p className="text-sm text-gray-400 mb-1">Available for Staking</p>
              <h2 className="text-2xl font-bold">{stakingOpportunities.length} options</h2>
              <p className="text-sm text-blue-400 mt-1 flex items-center">
                <FiInfo className="mr-1" /> Up to 11.2% APR available
              </p>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex space-x-4 mb-6 border-b border-gray-800 pb-2">
            <button
              onClick={() => setActiveTab('myStakes')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'myStakes' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              My Staking Positions
            </button>
            <button
              onClick={() => setActiveTab('opportunities')}
              className={`pb-2 px-1 border-b-2 ${
                activeTab === 'opportunities' ? 'border-blue-500 text-blue-500' : 'border-transparent text-gray-400 hover:text-gray-300'
              }`}
            >
              Staking Opportunities
            </button>
          </div>

          {/* My Staking Positions */}
          {activeTab === 'myStakes' && (
            <div>
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-medium">Your Staking Positions</h2>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setFilterStatus('all')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      filterStatus === 'all' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    All
                  </button>
                  <button
                    onClick={() => setFilterStatus('locked')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      filterStatus === 'locked' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    Locked
                  </button>
                  <button
                    onClick={() => setFilterStatus('unlocked')}
                    className={`px-3 py-1 text-sm rounded-lg ${
                      filterStatus === 'unlocked' ? 'bg-blue-600 text-white' : 'bg-gray-800 text-gray-300'
                    }`}
                  >
                    Unlocked
                  </button>
                </div>
              </div>

              {filteredPositions.length === 0 ? (
                <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-8 text-center">
                  <FiAlertCircle className="mx-auto mb-3 text-3xl text-gray-400" />
                  <p className="text-gray-400">No staking positions found with the selected filter.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {filteredPositions.map((position) => (
                    <div key={position.id} className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
                      <div className="flex flex-col md:flex-row md:items-center">
                        <div className="flex items-center mb-4 md:mb-0 md:w-1/4">
                          <div className="mr-3 w-10 h-10 relative">
                            <div className="rounded-full bg-gray-800 w-10 h-10 flex items-center justify-center">
                              {/* Use placeholder icon if image not available */}
                              <FiCodesandbox className="text-xl" />
                            </div>
                          </div>
                          <div>
                            <h3 className="font-medium">{position.asset}</h3>
                            <p className="text-sm text-gray-400">{position.symbol}</p>
                          </div>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-5 gap-4 md:w-3/4">
                          <div>
                            <p className="text-sm text-gray-400">Staked</p>
                            <p className="font-medium">{position.amount} {position.symbol}</p>
                            <p className="text-sm text-gray-400">${position.amountUSD.toLocaleString()}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">APR</p>
                            <p className="font-medium text-green-400">{position.apr}%</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">Rewards</p>
                            <p className="font-medium">{position.rewards} {position.symbol}</p>
                            <p className="text-sm text-gray-400">${position.rewardsUSD.toLocaleString()}</p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">Lock Period</p>
                            <p className="font-medium flex items-center">
                              <FiClock className="mr-1 text-gray-400" /> {position.lockPeriod}
                            </p>
                          </div>

                          <div>
                            <p className="text-sm text-gray-400">Status</p>
                            {position.status === 'locked' ? (
                              <p className="font-medium flex items-center text-yellow-500">
                                <FiLock className="mr-1" /> Locked ({position.timeRemaining})
                              </p>
                            ) : (
                              <p className="font-medium flex items-center text-green-500">
                                <FiUnlock className="mr-1" /> Unlocked
                              </p>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="flex mt-4 space-x-3 justify-end">
                        {position.status === 'unlocked' ? (
                          <>
                            <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                              Claim Rewards
                            </button>
                            <button className="px-4 py-2 border border-gray-700 text-gray-300 rounded-lg hover:bg-gray-800 transition">
                              Unstake
                            </button>
                          </>
                        ) : (
                          <button className="px-4 py-2 bg-blue-600/20 text-blue-400 rounded-lg hover:bg-blue-600/30 transition">
                            View Details
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staking Opportunities */}
          {activeTab === 'opportunities' && (
            <div>
              <h2 className="text-xl font-medium mb-4">Available Staking Opportunities</h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {stakingOpportunities.map((opportunity) => (
                  <div key={opportunity.id} className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5">
                    <div className="flex items-center mb-4">
                      <div className="mr-3 w-10 h-10 relative">
                        <div className="rounded-full bg-gray-800 w-10 h-10 flex items-center justify-center">
                          {/* Use placeholder icon if image not available */}
                          <FiCodesandbox className="text-xl" />
                        </div>
                      </div>
                      <div>
                        <h3 className="font-medium">{opportunity.asset}</h3>
                        <p className="text-sm text-gray-400">{opportunity.symbol}</p>
                      </div>
                      <div className="ml-auto">
                        <span className="px-3 py-1 bg-green-500/20 text-green-400 rounded-lg text-sm font-medium">
                          {opportunity.apr}% APR
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 mb-4">
                      <div>
                        <p className="text-sm text-gray-400">Lock Period</p>
                        <p className="font-medium">{opportunity.lockPeriod}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">Min. Amount</p>
                        <p className="font-medium">{opportunity.minAmount} {opportunity.symbol}</p>
                      </div>
                      <div>
                        <p className="text-sm text-gray-400">TVL</p>
                        <p className="font-medium">{opportunity.tvl}</p>
                      </div>
                    </div>

                    <div className="flex justify-end">
                      <button className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition">
                        Stake {opportunity.symbol}
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6 bg-blue-900/30 border border-blue-800 rounded-xl p-4 flex items-start">
                <FiAward className="text-blue-400 text-xl mt-1 mr-3 flex-shrink-0" />
                <div>
                  <h3 className="font-medium text-blue-400">Earn More with Extended Lock Periods</h3>
                  <p className="text-sm text-gray-300 mt-1">
                    Staking with longer lock periods typically offers higher APR rates. Compare different options to maximize your rewards based on your investment timeline.
                  </p>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </main>
    </DashboardLayout>
  );
} 