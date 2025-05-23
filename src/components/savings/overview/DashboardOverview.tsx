"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance } from "wagmi";
import { Address } from "viem";
import { motion } from "framer-motion";

// EXAMPLE COMPONENT: Simplified chart for demonstration purposes only
// In production, consider using a proper charting library like recharts or chart.js
// This avoids heavy calculations in the UI thread
const SimpleAreaChart = ({ data, color }: { data: number[], color: string }) => {
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min;
  
  const points = data.map((value, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((value - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg className="w-full h-16" viewBox="0 0 100 100" preserveAspectRatio="none">
      <defs>
        <linearGradient id={`gradient-${color}`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={color} stopOpacity="0.4" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <polygon 
        points={`0,100 ${points} 100,100`} 
        fill={`url(#gradient-${color})`}
      />
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
};

// EXAMPLE COMPONENT: Activity item for demonstration
// In production, this would display actual transaction data from blockchain events
// or from a database of user interactions
const ActivityItem = ({ 
  title, 
  description, 
  timestamp, 
  type, 
  amount, 
  status 
}: { 
  title: string; 
  description: string; 
  timestamp: string; 
  type: string; 
  amount: string; 
  status: "completed" | "pending" | "failed"; 
}) => {
  const statusColors = {
    completed: "bg-green-500",
    pending: "bg-yellow-500",
    failed: "bg-red-500"
  };

  return (
    <div className="flex items-start p-3 rounded-lg hover:bg-gray-800/30 transition-colors">
      <div className={`w-10 h-10 rounded-full ${type === "saving" ? "bg-blue-500/20" : "bg-purple-500/20"} flex items-center justify-center mr-3`}>
        {type === "saving" ? (
          <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 5V19M12 5L6 11M12 5L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        ) : (
          <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M3 13.2L8.5 7.5L12.5 11.5L21 3M21 3H15M21 3V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        )}
      </div>
      <div className="flex-1">
        <div className="flex justify-between">
          <h4 className="font-medium text-white">{title}</h4>
          <span className="text-sm text-gray-400">{timestamp}</span>
        </div>
        <p className="text-sm text-gray-400 mt-1">{description}</p>
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${statusColors[status]} mr-2`}></div>
            <span className="text-xs text-gray-400 capitalize">{status}</span>
          </div>
          <span className="text-sm font-medium text-white">{amount}</span>
        </div>
      </div>
    </div>
  );
};

export default function DashboardOverview() {
  const [mounted, setMounted] = useState(false);
  const [totalSavings, setTotalSavings] = useState("0.00");
  const [totalYield, setTotalYield] = useState("0.00");
  
  // EXAMPLE DATA: Sample chart data for demonstration purposes only
  const [savingsData] = useState([10, 13, 15, 25, 35, 40, 50, 60, 65, 50, 70, 95]);
  const [yieldData] = useState([5, 10, 15, 20, 25, 30, 25, 40, 45, 50, 60, 70]);
  const [investmentData] = useState([2, 5, 10, 15, 25, 35, 45, 40, 60, 70, 85, 100]);
  
  // Get user account info
  const { address } = useAccount();
  
  // EXAMPLE DATA: Sample activity data for demonstration purposes only
  const recentActivity = [
    {
      title: "Daily Savings Plan",
      description: "Automatic saving of 0.01 ETH",
      timestamp: "2 hours ago",
      type: "saving",
      amount: "0.01 ETH",
      status: "completed" as const
    },
    {
      title: "DCA Investment",
      description: "Scheduled purchase of USDC",
      timestamp: "Yesterday",
      type: "investment",
      amount: "50 USDC",
      status: "completed" as const
    },
    {
      title: "Yield Strategy",
      description: "Optimized yield from Compound",
      timestamp: "2 days ago",
      type: "investment",
      amount: "+0.02 ETH",
      status: "completed" as const
    },
    {
      title: "Daily Savings Plan",
      description: "Automatic saving of 0.01 ETH",
      timestamp: "3 days ago",
      type: "saving",
      amount: "0.01 ETH",
      status: "completed" as const
    }
  ];

  // Get ETH balance for the user - using single RPC call to avoid chain congestion
  const { data: ethBalance } = useBalance({
    address: address as Address | undefined,
  });

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    
    // EXAMPLE: Simulate loading data from contracts
    // In a real app, you would fetch this from your contracts
    setTimeout(() => {
      setTotalSavings("1.45");
      setTotalYield("0.32");
    }, 1000);

    // OPTIMIZATION NOTE: In production, bundle multiple data requests into a single call
    // to minimize RPC requests to the blockchain. Consider using multicall patterns or
    // batched requests when implementing actual blockchain interactions.
    // Example: Instead of separate calls for savings, yield, and investments,
    // create a single contract method that returns all needed data in one transaction.
  }, []);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Overview cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Current Balance</p>
              <h3 className="text-white text-2xl font-bold mt-1">
                {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : "0.0000"} ETH
              </h3>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M7.5 12H16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 7.5V16.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {/* EXAMPLE: Sample chart for demonstration purposes */}
            <SimpleAreaChart data={[10, 15, 25, 35, 30, 40, 50, 65, 75, 70, 90, 100]} color="#3b82f6" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Savings</p>
              {/* EXAMPLE: Example value for demonstration */}
              <h3 className="text-white text-2xl font-bold mt-1">{totalSavings} ETH</h3>
            </div>
            <div className="bg-green-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M12 5L6 11M12 5L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {/* EXAMPLE: Sample chart for demonstration */}
            <SimpleAreaChart data={savingsData} color="#22c55e" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.2 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">Total Yield</p>
              {/* EXAMPLE: Example yield value for demonstration */}
              <h3 className="text-white text-2xl font-bold mt-1">{totalYield} ETH</h3>
            </div>
            <div className="bg-yellow-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-yellow-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 8.75C12 7.64543 11.1046 6.75 10 6.75H6C4.89543 6.75 4 7.64543 4 8.75V15.25C4 16.3546 4.89543 17.25 6 17.25H10C11.1046 17.25 12 16.3546 12 15.25V8.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M20 8.75C20 7.64543 19.1046 6.75 18 6.75H14C12.8954 6.75 12 7.64543 12 8.75V15.25C12 16.3546 12.8954 17.25 14 17.25H18C19.1046 17.25 20 16.3546 20 15.25V8.75Z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {/* EXAMPLE: Sample chart for demonstration */}
            <SimpleAreaChart data={yieldData} color="#eab308" />
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.3 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <div className="flex justify-between items-start">
            <div>
              <p className="text-gray-400 text-sm">DCA Investments</p>
              {/* EXAMPLE: Example DCA value for demonstration */}
              <h3 className="text-white text-2xl font-bold mt-1">100 USDC</h3>
            </div>
            <div className="bg-purple-500/20 p-3 rounded-lg">
              <svg className="w-6 h-6 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 13.2L8.5 7.5L12.5 11.5L21 3M21 3H15M21 3V9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          <div className="mt-4">
            {/* EXAMPLE: Sample chart for demonstration */}
            <SimpleAreaChart data={investmentData} color="#a855f7" />
          </div>
        </motion.div>
      </div>

      {/* Quick actions */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.4 }}
        className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
      >
        <h3 className="text-white text-lg font-semibold mb-4">Quick Actions</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          <button className="bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 rounded-lg p-4 transition-colors flex items-center">
            <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 5V19M12 5L6 11M12 5L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-medium">Add Savings</span>
          </button>
          
          <button className="bg-purple-500/10 hover:bg-purple-500/20 border border-purple-500/30 rounded-lg p-4 transition-colors flex items-center">
            <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-purple-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M7 10V14M12 6V18M17 10V14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-medium">Setup DCA</span>
          </button>
          
          <button className="bg-yellow-500/10 hover:bg-yellow-500/20 border border-yellow-500/30 rounded-lg p-4 transition-colors flex items-center">
            <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-yellow-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 17L12 11.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8.01001L12.01 7.99889" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-medium">Optimize Yield</span>
          </button>
          
          <button className="bg-green-500/10 hover:bg-green-500/20 border border-green-500/30 rounded-lg p-4 transition-colors flex items-center">
            <div className="w-10 h-10 rounded-full bg-green-500/20 flex items-center justify-center mr-3">
              <svg className="w-5 h-5 text-green-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 10H21M7 15H8M12 15H13M6 19H18C19.6569 19 21 17.6569 21 16V8C21 6.34315 19.6569 5 18 5H6C4.34315 5 3 6.34315 3 8V16C3 17.6569 4.34315 19 6 19Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <span className="text-white font-medium">Manage Subscriptions</span>
          </button>
        </div>
      </motion.div>

      {/* Recent activity and strategy */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.5 }}
          className="lg:col-span-2 bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <div className="flex justify-between items-center mb-6">
            <h3 className="text-white text-lg font-semibold">Recent Activity</h3>
            <button className="text-sm text-blue-500 hover:text-blue-400 transition-colors">View All</button>
          </div>
          
          <div className="space-y-2">
            {recentActivity.map((activity, index) => (
              <ActivityItem key={index} {...activity} />
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.6 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <h3 className="text-white text-lg font-semibold mb-6">Your Strategy</h3>
          
          <div className="space-y-6">
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">Savings Progress</p>
                {/* EXAMPLE: Sample progress percentage for demonstration */}
                <span className="text-sm font-medium text-white">45%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: "45%" }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">Yield Rate</p>
                {/* EXAMPLE: Sample yield rate for demonstration */}
                <span className="text-sm font-medium text-green-500">+6.2%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-yellow-500 to-green-500 rounded-full" style={{ width: "62%" }}></div>
              </div>
            </div>
            
            <div>
              <div className="flex justify-between items-center mb-2">
                <p className="text-sm text-gray-400">DCA Completion</p>
                {/* EXAMPLE: Sample DCA completion for demonstration */}
                <span className="text-sm font-medium text-white">75%</span>
              </div>
              <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full" style={{ width: "75%" }}></div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-800 mt-4">
              <h4 className="text-white font-medium mb-3">Asset Allocation</h4>
              {/* EXAMPLE: Sample asset allocation for demonstration */}
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-blue-500 mr-2"></div>
                    <span className="text-sm text-gray-400">ETH</span>
                  </div>
                  <span className="text-sm text-white">60%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-green-500 mr-2"></div>
                    <span className="text-sm text-gray-400">USDC</span>
                  </div>
                  <span className="text-sm text-white">30%</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <div className="flex items-center">
                    <div className="w-3 h-3 rounded-full bg-purple-500 mr-2"></div>
                    <span className="text-sm text-gray-400">WETH</span>
                  </div>
                  <span className="text-sm text-white">10%</span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
} 