"use client";

import { useEffect, useState } from 'react';
import DashboardLayout from '@/components/core/DashboardLayout';
import { useAccount } from 'wagmi';
import { motion } from 'framer-motion';
import { FiArrowUp, FiArrowDown, FiDollarSign, FiActivity, FiPieChart } from 'react-icons/fi';
import { PieChart, Pie, Cell, ResponsiveContainer, LineChart, Line, XAxis, YAxis, Tooltip, AreaChart, Area } from 'recharts';

export default function PortfolioDashboard() {
  const [mounted, setMounted] = useState(false);
  const [timeRange, setTimeRange] = useState('1W');
  const [portfolioValue, setPortfolioValue] = useState('15,450.78');
  const [portfolioChange, setPortfolioChange] = useState('+2.34');
  const { isConnected } = useAccount();
  
  const assets = [
    { name: "Ethereum", symbol: "ETH", balance: "2.45", value: 4532.50, price: 1850, change: "+2.5", color: "#627EEA" },
    { name: "Bitcoin", symbol: "BTC", balance: "0.15", value: 4485.00, price: 29900, change: "+1.2", color: "#F7931A" },
    { name: "Uniswap", symbol: "UNI", balance: "125.5", value: 891.05, price: 7.1, change: "-0.8", color: "#FF007A" },
    { name: "Chainlink", symbol: "LINK", balance: "75.35", value: 1243.28, price: 16.5, change: "+3.4", color: "#2A5ADA" },
    { name: "USD Coin", symbol: "USDC", balance: "1,540.50", value: 1540.50, price: 1, change: "0.0", color: "#2775CA" },
    { name: "Aave", symbol: "AAVE", balance: "15.75", value: 1386.00, price: 88, change: "-1.5", color: "#B6509E" },
    { name: "Solana", symbol: "SOL", balance: "32.5", value: 1372.45, price: 42.23, change: "+4.7", color: "#00FFA3" },
  ];

  const portfolioData = [
    { name: 'Mon', value: 15250 },
    { name: 'Tue', value: 15100 },
    { name: 'Wed', value: 15300 },
    { name: 'Thu', value: 15200 },
    { name: 'Fri', value: 15350 },
    { name: 'Sat', value: 15400 },
    { name: 'Sun', value: 15450 },
  ];

  const pieData = assets.map(asset => ({
    name: asset.symbol,
    value: asset.value,
    color: asset.color
  }));

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return <div className="loading-container">Loading...</div>;
  
  const totalValue = assets.reduce((acc, asset) => acc + asset.value, 0);
  
  return (
    <DashboardLayout>
      <main className="p-6 overflow-auto h-full">
        <motion.div 
          className="w-full"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Portfolio Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h2 className="text-xl font-bold mb-1">Portfolio Value</h2>
                  <div className="flex items-center">
                    <span className="text-3xl font-bold mr-2">${portfolioValue}</span>
                    <span className={`flex items-center text-sm ${portfolioChange.startsWith('+') ? 'text-green-500' : 'text-red-500'}`}>
                      {portfolioChange.startsWith('+') ? <FiArrowUp className="mr-1" /> : <FiArrowDown className="mr-1" />}
                      {portfolioChange}%
                    </span>
                  </div>
                </div>
                <div className="flex bg-gray-800 rounded-lg p-1">
                  {['1D', '1W', '1M', 'YTD', 'ALL'].map((range) => (
                    <button
                      key={range}
                      className={`px-3 py-1 text-sm font-medium rounded-md transition ${
                        timeRange === range ? 'bg-blue-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                      onClick={() => setTimeRange(range)}
                    >
                      {range}
                    </button>
                  ))}
                </div>
              </div>
              
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={portfolioData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#9CA3AF' }} />
                    <YAxis domain={['dataMin - 200', 'dataMax + 200']} hide />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#E5E7EB' }}
                      formatter={(value: number) => [`$${value}`, 'Value']}
                      labelStyle={{ color: '#9CA3AF' }}
                    />
                    <Area
                      type="monotone"
                      dataKey="value"
                      stroke="#3B82F6"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorValue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>
            
            <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
              <h2 className="text-xl font-bold mb-4">Allocation</h2>
              <div className="h-48 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={2}
                      dataKey="value"
                    >
                      {pieData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', borderRadius: '0.5rem' }}
                      itemStyle={{ color: '#E5E7EB' }}
                      formatter={(value: number) => [`$${value.toFixed(2)}`, '']}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              
              <div className="mt-4 space-y-2">
                {assets.slice(0, 5).map((asset) => (
                  <div key={asset.symbol} className="flex items-center">
                    <div
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: asset.color }}
                    ></div>
                    <span className="text-sm">{asset.symbol}</span>
                    <span className="text-xs text-gray-400 ml-auto">
                      {(asset.value / totalValue * 100).toFixed(1)}%
                    </span>
                  </div>
                ))}
                {assets.length > 5 && (
                  <div className="text-xs text-gray-400 text-center mt-2">
                    +{assets.length - 5} more
                  </div>
                )}
              </div>
            </div>
          </div>
          
          {/* Assets Table */}
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
            <h2 className="text-xl font-bold mb-4">Your Assets</h2>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-800">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">Asset</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Price</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">24h</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Balance</th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-400 uppercase tracking-wider">Value</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {assets.map((asset) => (
                    <tr key={asset.symbol} className="hover:bg-gray-800/30 transition-colors">
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div
                            className="w-8 h-8 rounded-full mr-3 flex items-center justify-center"
                            style={{ backgroundColor: asset.color }}
                          >
                            <span className="text-xs font-bold text-white">{asset.symbol.slice(0, 2)}</span>
                          </div>
                          <div>
                            <div className="font-medium">{asset.name}</div>
                            <div className="text-xs text-gray-400">{asset.symbol}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        ${asset.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        <span className={`${asset.change.startsWith('+') ? 'text-green-500' : asset.change === '0.0' ? 'text-gray-400' : 'text-red-500'}`}>
                          {asset.change}%
                        </span>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right">
                        {asset.balance} {asset.symbol}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-right font-medium">
                        ${asset.value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </motion.div>
      </main>
    </DashboardLayout>
  );
} 