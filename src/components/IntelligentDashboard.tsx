"use client";

import { useState, useEffect, useMemo } from "react";
import { useAccount, useBalance } from "wagmi";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";

// Custom SVG Icons
const IconArrowRight = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14"></path>
    <path d="m12 5 7 7-7 7"></path>
  </svg>
);

const IconBarChart = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" x2="12" y1="20" y2="10"></line>
    <line x1="18" x2="18" y1="20" y2="4"></line>
    <line x1="6" x2="6" y1="20" y2="16"></line>
  </svg>
);

const IconArrowUp = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 7-7 7 7"></path>
    <path d="M12 19V5"></path>
  </svg>
);

const IconArrowDown = () => (
  <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5v14"></path>
    <path d="m19 12-7 7-7-7"></path>
  </svg>
);

// Types
type SavingsData = {
  totalSaved: number;
  savingsGoal: number;
  savingsRate: number;
  nextSavingDate: string;
  savingsHistory: { date: string; amount: number }[];
};

type DCAPerformance = {
  totalInvested: number;
  currentValue: number;
  averageBuyPrice: number;
  lastBuyDate: string;
  nextBuyDate: string;
  tokenBalance: number;
  token: string;
  transactions: { date: string; price: number; amount: number }[];
};

type YieldData = {
  totalYield: number;
  currentAPY: number;
  estimatedMonthlyYield: number;
  bestProtocol: string;
  yieldHistory: { date: string; apy: number }[];
  protocolComparison: { name: string; apy: number }[];
};

// Mock data fetching functions (would be real API calls in production)
const fetchUserSavings = async (address: string): Promise<SavingsData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  // Mock data
  return {
    totalSaved: 1.45,
    savingsGoal: 5.0,
    savingsRate: 0.01,
    nextSavingDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    savingsHistory: Array.from({ length: 30 }).map((_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      amount: 0.01 + (Math.random() * 0.005),
    })),
  };
};

const fetchDCAPerformance = async (address: string): Promise<DCAPerformance> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 700));
  
  // Mock data
  return {
    totalInvested: 0.5,
    currentValue: 0.58,
    averageBuyPrice: 1800,
    lastBuyDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    nextBuyDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    tokenBalance: 0.3,
    token: "ETH",
    transactions: Array.from({ length: 10 }).map((_, i) => ({
      date: new Date(Date.now() - (9 - i) * 7 * 24 * 60 * 60 * 1000).toISOString(),
      price: 1800 - 100 + Math.random() * 200,
      amount: 0.05,
    })),
  };
};

const fetchYieldPerformance = async (address: string): Promise<YieldData> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 600));
  
  // Mock data
  return {
    totalYield: 0.32,
    currentAPY: 4.8,
    estimatedMonthlyYield: 0.06,
    bestProtocol: "Compound",
    yieldHistory: Array.from({ length: 30 }).map((_, i) => ({
      date: new Date(Date.now() - (29 - i) * 24 * 60 * 60 * 1000).toISOString(),
      apy: 4.5 + Math.random() * 0.8,
    })),
    protocolComparison: [
      { name: "Compound", apy: 4.8 },
      { name: "Aave", apy: 4.2 },
      { name: "Yearn", apy: 5.1 },
      { name: "Lido", apy: 3.8 },
    ],
  };
};

// Helper functions for metrics
const calculateTotalSavings = (data: SavingsData): string => {
  return data.totalSaved.toFixed(4);
};

const calculateAverageYield = (data: YieldData): string => {
  return data.currentAPY.toFixed(2);
};

const calculateNextDCADate = (data: DCAPerformance): string => {
  return new Date(data.nextBuyDate).toLocaleDateString();
};

const calculateSavingsProgress = (data: SavingsData): number => {
  return Math.min(100, (data.totalSaved / data.savingsGoal) * 100);
};

const compareDCAtoLumpSum = (data: DCAPerformance): { 
  performance: string;
  percentage: string;
  isPositive: boolean;
} => {
  // Simple mock calculation - would be more complex in real app
  const dcaValue = data.currentValue;
  const lumpSumValue = data.totalInvested * (data.transactions[data.transactions.length - 1].price / data.transactions[0].price);
  const diff = dcaValue - lumpSumValue;
  const percentage = (diff / lumpSumValue) * 100;
  
  return {
    performance: diff.toFixed(4),
    percentage: Math.abs(percentage).toFixed(2),
    isPositive: diff > 0,
  };
};

const generateYieldSuggestions = (data: YieldData): { 
  protocol: string;
  potentialAPY: number;
  additionalYield: number;
} => {
  const bestProtocol = data.protocolComparison.reduce((a, b) => (a.apy > b.apy ? a : b));
  const additionalYield = bestProtocol.apy - data.currentAPY;
  
  return {
    protocol: bestProtocol.name,
    potentialAPY: bestProtocol.apy,
    additionalYield,
  };
};

// Chart components
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

// UI Components
const ActionableInsightsPanel = ({ metrics }: { metrics: any }) => {
  if (!metrics) return null;
  
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-5 mb-6">
      <h3 className="text-lg font-semibold mb-3">Actionable Insights</h3>
      <div className="space-y-4">
        {metrics.dcaPerformanceVsLumpSum.isPositive ? (
          <div className="flex items-start">
            <div className="bg-green-500/20 p-2 rounded-full mr-3">
              <IconArrowUp />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Your DCA strategy is outperforming a lump sum investment</p>
              <p className="text-xs text-gray-400">Your DCA approach is performing {metrics.dcaPerformanceVsLumpSum.percentage}% better than a lump sum would have.</p>
            </div>
          </div>
        ) : (
          <div className="flex items-start">
            <div className="bg-yellow-500/20 p-2 rounded-full mr-3">
              <IconArrowDown />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Market has been trending upward lately</p>
              <p className="text-xs text-gray-400">In the current market, a lump sum approach is outperforming your DCA by {metrics.dcaPerformanceVsLumpSum.percentage}%.</p>
            </div>
          </div>
        )}
        
        {metrics.yieldOptimizationSuggestions.additionalYield > 0 && (
          <div className="flex items-start">
            <div className="bg-blue-500/20 p-2 rounded-full mr-3">
              <IconArrowRight />
            </div>
            <div>
              <p className="text-sm font-medium text-white">Optimize your yield strategy</p>
              <p className="text-xs text-gray-400">
                Moving to {metrics.yieldOptimizationSuggestions.protocol} could increase your APY by {metrics.yieldOptimizationSuggestions.additionalYield.toFixed(1)}%, 
                resulting in an additional {(metrics.totalSaved * metrics.yieldOptimizationSuggestions.additionalYield / 100).toFixed(4)} ETH annually.
              </p>
            </div>
          </div>
        )}
        
        <div className="flex items-start">
          <div className="bg-purple-500/20 p-2 rounded-full mr-3">
            <IconBarChart />
          </div>
          <div>
            <p className="text-sm font-medium text-white">Next DCA purchase scheduled</p>
            <p className="text-xs text-gray-400">Your next automatic investment is scheduled for {metrics.nextDCADate}.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

const SavingsProgressTracker = ({ data }: { data: SavingsData }) => {
  const progressPercentage = calculateSavingsProgress(data);
  
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Savings Progress</h3>
          <p className="text-sm text-gray-400">Tracking towards your {data.savingsGoal} ETH goal</p>
        </div>
        <div className="bg-blue-500/20 p-2 rounded-full">
          <IconBarChart />
        </div>
      </div>
      
      <div className="mb-4">
        <div className="flex justify-between mb-1">
          <span className="text-sm text-gray-400">Progress</span>
          <span className="text-sm font-medium">{progressPercentage.toFixed(0)}%</span>
        </div>
        <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
          <div className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
        </div>
      </div>
      
      <div className="grid grid-cols-3 gap-4 mb-4">
        <div>
          <p className="text-xs text-gray-500">Total Saved</p>
          <p className="text-lg font-bold">{data.totalSaved.toFixed(4)} ETH</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Goal</p>
          <p className="text-lg font-bold">{data.savingsGoal.toFixed(2)} ETH</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Saving Rate</p>
          <p className="text-lg font-bold">{data.savingsRate.toFixed(4)} ETH/day</p>
        </div>
      </div>
      
      <div>
        <p className="text-xs text-gray-500 mb-2">Savings History (30 days)</p>
        <SimpleAreaChart 
          data={data.savingsHistory.map(item => item.amount)} 
          color="#3b82f6" 
        />
      </div>
    </div>
  );
};

const DCAPerformanceChart = ({ data }: { data: DCAPerformance }) => {
  const comparison = compareDCAtoLumpSum(data);
  
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">DCA Performance</h3>
          <p className="text-sm text-gray-400">Dollar-cost averaging analysis</p>
        </div>
        <div className="bg-purple-500/20 p-2 rounded-full">
          <IconBarChart />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs text-gray-500">Total Invested</p>
          <p className="text-lg font-bold">{data.totalInvested.toFixed(4)} ETH</p>
          <p className="text-xs text-gray-400">Across {data.transactions.length} purchases</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Current Value</p>
          <p className="text-lg font-bold">{data.currentValue.toFixed(4)} ETH</p>
          <p className="text-xs text-gray-400">
            <span className={comparison.isPositive ? "text-green-500" : "text-red-500"}>
              {comparison.isPositive ? "+" : "-"}{comparison.percentage}%
            </span> vs. lump sum
          </p>
        </div>
      </div>
      
      <div className="mb-6">
        <div className="flex justify-between mb-1">
          <p className="text-xs text-gray-500">Average Buy Price</p>
          <p className="text-sm">${data.averageBuyPrice.toFixed(2)}</p>
        </div>
        <div className="flex justify-between mb-4">
          <p className="text-xs text-gray-500">Token Balance</p>
          <p className="text-sm">{data.tokenBalance.toFixed(4)} {data.token}</p>
        </div>
      </div>
      
      <div>
        <div className="flex justify-between mb-2">
          <p className="text-xs text-gray-500">Purchase History & Price</p>
          <p className="text-xs text-gray-500">Next: {new Date(data.nextBuyDate).toLocaleDateString()}</p>
        </div>
        <div className="relative h-40">
          <svg className="w-full h-full" viewBox="0 0 100 100" preserveAspectRatio="none">
            {/* Price line */}
            {(() => {
              const prices = data.transactions.map(t => t.price);
              const max = Math.max(...prices);
              const min = Math.min(...prices);
              const range = max - min;
              
              const points = prices.map((price, index) => {
                const x = (index / (prices.length - 1)) * 100;
                const y = 100 - ((price - min) / range) * 100;
                return `${x},${y}`;
              }).join(' ');
              
              return (
                <>
                  <path
                    d={`M0,${100 - ((prices[0] - min) / range) * 100} ${points}`}
                    fill="none"
                    stroke="#A855F7"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  
                  {/* Purchase markers */}
                  {data.transactions.map((t, i) => {
                    const x = (i / (prices.length - 1)) * 100;
                    const y = 100 - ((t.price - min) / range) * 100;
                    return (
                      <circle
                        key={i}
                        cx={x}
                        cy={y}
                        r="2"
                        fill="#A855F7"
                        stroke="#000"
                        strokeWidth="1"
                      />
                    );
                  })}
                </>
              );
            })()}
          </svg>
          
          {/* Y-axis labels */}
          <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500 pointer-events-none">
            <span>${Math.max(...data.transactions.map(t => t.price)).toFixed(0)}</span>
            <span>${Math.min(...data.transactions.map(t => t.price)).toFixed(0)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

const YieldComparisonChart = ({ data }: { data: YieldData }) => {
  const suggestions = generateYieldSuggestions(data);
  
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 mb-6">
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold">Yield Performance</h3>
          <p className="text-sm text-gray-400">Current APY: {data.currentAPY.toFixed(2)}%</p>
        </div>
        <div className="bg-yellow-500/20 p-2 rounded-full">
          <IconArrowRight />
        </div>
      </div>
      
      <div className="grid grid-cols-2 gap-6 mb-6">
        <div>
          <p className="text-xs text-gray-500">Total Yield Earned</p>
          <p className="text-lg font-bold">{data.totalYield.toFixed(4)} ETH</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Estimated Monthly Yield</p>
          <p className="text-lg font-bold">{data.estimatedMonthlyYield.toFixed(4)} ETH</p>
        </div>
      </div>
      
      <div className="mb-6">
        <p className="text-xs text-gray-500 mb-2">APY History (30 days)</p>
        <SimpleAreaChart 
          data={data.yieldHistory.map(item => item.apy)} 
          color="#EAB308" 
        />
      </div>
      
      <div>
        <p className="text-xs text-gray-500 mb-3">Protocol Comparison</p>
        <div className="space-y-3">
          {data.protocolComparison.sort((a, b) => b.apy - a.apy).map((protocol) => (
            <div key={protocol.name} className="flex items-center">
              <div className="w-24 text-sm">{protocol.name}</div>
              <div className="flex-1 h-6 bg-gray-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${protocol.name === data.bestProtocol ? 'bg-green-500' : 'bg-blue-500'}`} 
                  style={{ width: `${(protocol.apy / 6) * 100}%` }}
                ></div>
              </div>
              <div className="w-16 text-right text-sm">
                {protocol.apy.toFixed(1)}%
                {protocol.name === suggestions.protocol && (
                  <span className="ml-1 text-xs text-green-500">✓</span>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {suggestions.additionalYield > 0 && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-900/30 rounded-lg">
            <div className="flex items-start">
              <div className="bg-green-500/20 p-1 rounded-full mr-2">
                <IconArrowRight />
              </div>
              <p className="text-xs text-green-300">
                Switching to {suggestions.protocol} could increase your APY by {suggestions.additionalYield.toFixed(1)}%
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

const NextActionsPanel = ({ 
  address 
}: { 
  address: string 
}) => {
  return (
    <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
      <h3 className="text-lg font-semibold mb-4">Recommended Actions</h3>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-blue-900/20 border border-blue-900/30 rounded-xl p-4 hover:border-blue-500 transition-colors cursor-pointer">
          <div className="flex items-center mb-3">
            <div className="bg-blue-500/20 p-2 rounded-full mr-3">
              <IconArrowRight />
            </div>
            <h4 className="font-medium">Increase Savings Rate</h4>
          </div>
          <p className="text-sm text-gray-400">
            Boost your savings by increasing your daily contribution from 0.01 to 0.015 ETH
          </p>
        </div>
        
        <div className="bg-purple-900/20 border border-purple-900/30 rounded-xl p-4 hover:border-purple-500 transition-colors cursor-pointer">
          <div className="flex items-center mb-3">
            <div className="bg-purple-500/20 p-2 rounded-full mr-3">
              <IconBarChart />
            </div>
            <h4 className="font-medium">Increase DCA Frequency</h4>
          </div>
          <p className="text-sm text-gray-400">
            Change your DCA schedule from weekly to daily for better average price
          </p>
        </div>
        
        <div className="bg-green-900/20 border border-green-900/30 rounded-xl p-4 hover:border-green-500 transition-colors cursor-pointer">
          <div className="flex items-center mb-3">
            <div className="bg-green-500/20 p-2 rounded-full mr-3">
              <IconArrowRight />
            </div>
            <h4 className="font-medium">Optimize Yield</h4>
          </div>
          <p className="text-sm text-gray-400">
            Move your assets to Compound to increase your APY by 0.6%
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Dashboard Component
const IntelligentDashboard = () => {
  // Get user account
  const { address } = useAccount();
  const [mounted, setMounted] = useState(false);
  
  // Fetch real-time data
  const { data: savingsData } = useQuery({
    queryKey: ['savings', address],
    queryFn: () => fetchUserSavings(address as string),
    refetchInterval: 30000, // Refresh every 30 seconds
    enabled: !!address && mounted,
  });
  
  const { data: dcaPerformance } = useQuery({
    queryKey: ['dca', address],
    queryFn: () => fetchDCAPerformance(address as string),
    staleTime: 60000, // Consider data fresh for 1 minute
    enabled: !!address && mounted,
  });
  
  const { data: yieldData } = useQuery({
    queryKey: ['yield', address],
    queryFn: () => fetchYieldPerformance(address as string),
    enabled: !!address && mounted,
  });
  
  // Calculate performance metrics
  const performanceMetrics = useMemo(() => {
    if (!savingsData || !dcaPerformance || !yieldData) return null;
    
    return {
      totalSaved: calculateTotalSavings(savingsData),
      averageYield: calculateAverageYield(yieldData),
      nextDCADate: calculateNextDCADate(dcaPerformance),
      savingsProgress: calculateSavingsProgress(savingsData),
      dcaPerformanceVsLumpSum: compareDCAtoLumpSum(dcaPerformance),
      yieldOptimizationSuggestions: generateYieldSuggestions(yieldData),
    };
  }, [savingsData, dcaPerformance, yieldData]);
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  if (!mounted) return null;
  if (!address) return <div className="p-4 text-center">Please connect your wallet to view your dashboard</div>;
  
  return (
    <div className="dashboard-container space-y-6">
      <h2 className="text-3xl font-bold mb-6">Your Smart Dashboard</h2>
      
      {performanceMetrics ? (
        <>
          <ActionableInsightsPanel metrics={performanceMetrics} />
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {savingsData && <SavingsProgressTracker data={savingsData} />}
            {dcaPerformance && <DCAPerformanceChart data={dcaPerformance} />}
          </div>
          
          {yieldData && <YieldComparisonChart data={yieldData} />}
          
          <NextActionsPanel address={address} />
        </>
      ) : (
        <div className="h-64 flex items-center justify-center">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      )}
    </div>
  );
};

export default IntelligentDashboard; 