"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useWriteContract } from "wagmi";
import { Address } from "viem";
import { motion } from "framer-motion";

// Chart component for visualizing investment history
const InvestmentChart = ({ data }: { data: { date: string; amount: number }[] }) => {
  const maxAmount = Math.max(...data.map(item => item.amount));
  const minAmount = Math.min(...data.map(item => item.amount));
  const range = maxAmount - minAmount;
  
  // Calculate points for the SVG path
  const points = data.map((item, index) => {
    const x = (index / (data.length - 1)) * 100;
    const y = 100 - ((item.amount - minAmount) / range) * 100;
    return `${x},${y}`;
  }).join(' ');
  
  return (
    <div className="h-24 w-full mt-4">
      <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none">
        {/* Grid lines */}
        <line x1="0" y1="25" x2="100" y2="25" stroke="#374151" strokeWidth="0.5" />
        <line x1="0" y1="50" x2="100" y2="50" stroke="#374151" strokeWidth="0.5" />
        <line x1="0" y1="75" x2="100" y2="75" stroke="#374151" strokeWidth="0.5" />
        
        {/* Line chart */}
        <polyline
          fill="none"
          stroke="#4F46E5"
          strokeWidth="2"
          points={points}
        />
        
        {/* Gradient area under the line */}
        <defs>
          <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#4F46E5" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#4F46E5" stopOpacity="0" />
          </linearGradient>
        </defs>
        <polyline
          fill="url(#gradient)"
          stroke="none"
          points={`0,100 ${points} 100,100`}
        />
        
        {/* Data points */}
        {data.map((item, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((item.amount - minAmount) / range) * 100;
          return (
            <circle
              key={index}
              cx={x}
              cy={y}
              r="1.5"
              fill="#4F46E5"
              stroke="#1F2937"
              strokeWidth="1"
            />
          );
        })}
      </svg>
    </div>
  );
};

// DCA plan card component
const DCAStrategyCard = ({
  title,
  description,
  token,
  amount,
  frequency,
  isActive,
  onManage,
  accentColor = "indigo",
}: {
  title: string;
  description: string;
  token: string;
  amount: string;
  frequency: string;
  isActive: boolean;
  onManage: () => void;
  accentColor?: "indigo" | "purple" | "emerald";
}) => {
  const colorClasses = {
    indigo: {
      bg: "bg-indigo-600/10",
      border: "border-indigo-500/30",
      hoverBg: "hover:bg-indigo-600/20",
      iconBg: "bg-indigo-600/20",
      iconColor: "text-indigo-500",
    },
    purple: {
      bg: "bg-purple-600/10",
      border: "border-purple-500/30",
      hoverBg: "hover:bg-purple-600/20",
      iconBg: "bg-purple-600/20",
      iconColor: "text-purple-500",
    },
    emerald: {
      bg: "bg-emerald-600/10",
      border: "border-emerald-500/30",
      hoverBg: "hover:bg-emerald-600/20",
      iconBg: "bg-emerald-600/20",
      iconColor: "text-emerald-500",
    },
  };

  const colors = colorClasses[accentColor];

  return (
    <div className={`${colors.bg} ${colors.border} ${colors.hoverBg} border rounded-xl p-6 transition-colors`}>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="text-white font-semibold text-lg">{title}</h3>
          <p className="text-gray-400 text-sm mt-1">{description}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${colors.iconColor}`} viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M7 11L12 6M12 6L17 11M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div className="mt-4 space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Target</span>
          <span className="text-white font-medium">{token}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Amount</span>
          <span className="text-white font-medium">{amount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Frequency</span>
          <span className="text-white font-medium">{frequency}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Status</span>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full ${isActive ? "bg-green-500" : "bg-gray-500"} mr-2`}></div>
            <span className="text-white font-medium">{isActive ? "Active" : "Inactive"}</span>
          </div>
        </div>
      </div>
      
      <button 
        onClick={onManage}
        className="w-full mt-6 py-2.5 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors"
      >
        Manage
      </button>
    </div>
  );
};

// Create DCA modal component
const CreateDCAModal = ({
  isOpen,
  onClose,
  onSave,
  availableTokens,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; token: string; amount: string; frequency: string }) => void;
  availableTokens: { symbol: string; name: string; address: string }[];
}) => {
  const [title, setTitle] = useState("");
  const [selectedToken, setSelectedToken] = useState(availableTokens[0]?.symbol || "");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      title, 
      token: selectedToken, 
      amount, 
      frequency 
    });
    setTitle("");
    setSelectedToken(availableTokens[0]?.symbol || "");
    setAmount("");
    setFrequency("daily");
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-semibold">Create DCA Strategy</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">Strategy Name</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. ETH Weekly DCA"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                required
              />
            </div>
            
            <div>
              <label htmlFor="token" className="block text-sm font-medium text-gray-400 mb-1">Target Token</label>
              <select
                id="token"
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              >
                {availableTokens.map((token) => (
                  <option key={token.address} value={token.symbol}>{token.name} ({token.symbol})</option>
                ))}
              </select>
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Amount (ETH)</label>
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.1"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
                pattern="^[0-9]*[.,]?[0-9]*$"
                required
              />
            </div>
            
            <div>
              <label htmlFor="frequency" className="block text-sm font-medium text-gray-400 mb-1">Frequency</label>
              <select
                id="frequency"
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 text-white"
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
            >
              Create Strategy
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// DCA strategy type
type DCAStrategy = {
  id: number;
  title: string;
  description: string;
  token: string;
  amount: string;
  frequency: string;
  isActive: boolean;
  accentColor: "indigo" | "purple" | "emerald";
};

export default function DCAComponent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [dcaStrategies, setDcaStrategies] = useState<DCAStrategy[]>([]);
  const [totalInvested, setTotalInvested] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  const [investmentHistory, setInvestmentHistory] = useState<{ date: string; amount: number }[]>([]);
  
  const { address } = useAccount();
  
  // Get ETH balance for the user
  const { data: ethBalance } = useBalance({
    address: address as Address | undefined,
  });

  // Available tokens for DCA
  const availableTokens = [
    { symbol: "ETH", name: "Ethereum", address: "0x0000000000000000000000000000000000000000" },
    { symbol: "WBTC", name: "Wrapped Bitcoin", address: "0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599" },
    { symbol: "LINK", name: "Chainlink", address: "0x514910771AF9Ca656af840dff83E8264EcF986CA" },
    { symbol: "UNI", name: "Uniswap", address: "0x1f9840a85d5aF5bf1D1762F925BDADdC4201F984" },
    { symbol: "AAVE", name: "Aave", address: "0x7Fc66500c84A76Ad7e9c93437bFc5Ac33E2DDaE9" },
  ];

  // Create DCA contract write hook
  // In a real implementation, this would be used to write to the contract
  const { /* writeContract, */ data: createData } = useWriteContract();
  
  // Wait for the transaction to complete
  const { isLoading: isCreateLoading, isSuccess: isCreateSuccess } = useWaitForTransaction({
    hash: createData,
  });

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    
    // Sample data (would come from your contracts in a real app)
    setDcaStrategies([
      {
        id: 1,
        title: "Weekly ETH DCA",
        description: "Dollar-cost average into ETH weekly",
        token: "ETH",
        amount: "0.1 ETH",
        frequency: "Weekly",
        isActive: true,
        accentColor: "indigo",
      },
      {
        id: 2,
        title: "WBTC Accumulation",
        description: "Stack sats with weekly WBTC buys",
        token: "WBTC",
        amount: "0.05 ETH",
        frequency: "Weekly",
        isActive: true,
        accentColor: "purple",
      },
      {
        id: 3,
        title: "LINK DCA Strategy",
        description: "Accumulate LINK tokens monthly",
        token: "LINK",
        amount: "0.2 ETH",
        frequency: "Monthly",
        isActive: false,
        accentColor: "emerald",
      },
    ]);
    
    setTotalInvested("2.85");
    
    // Sample investment history data
    setInvestmentHistory([
      { date: "2023-01-01", amount: 0.15 },
      { date: "2023-02-01", amount: 0.13 },
      { date: "2023-03-01", amount: 0.18 },
      { date: "2023-04-01", amount: 0.11 },
      { date: "2023-05-01", amount: 0.22 },
      { date: "2023-06-01", amount: 0.25 },
      { date: "2023-07-01", amount: 0.19 },
      { date: "2023-08-01", amount: 0.21 },
      { date: "2023-09-01", amount: 0.17 },
      { date: "2023-10-01", amount: 0.24 },
      { date: "2023-11-01", amount: 0.3 },
      { date: "2023-12-01", amount: 0.33 },
    ]);
  }, []);

  // Handle creating a new DCA strategy
  const handleCreateStrategy = (data: { title: string; token: string; amount: string; frequency: string }) => {
    setIsLoading(true);
    
    // In a real app, this would call your contract
    // writeContract({
    //   address: CONTRACT_ADDRESSES.DCA,
    //   abi: [], // Replace with your contract ABI
    //   functionName: 'createDCAStrategy',
    //   args: [data.title, data.token, data.amount, data.frequency],
    // });
    
    // Simulating contract interaction
    setTimeout(() => {
      const newStrategy: DCAStrategy = {
        id: dcaStrategies.length + 1,
        title: data.title,
        description: `DCA ${data.amount} ETH into ${data.token} ${data.frequency.toLowerCase()}`,
        token: data.token,
        amount: `${data.amount} ETH`,
        frequency: data.frequency.charAt(0).toUpperCase() + data.frequency.slice(1),
        isActive: true,
        accentColor: "indigo",
      };
      
      setDcaStrategies([...dcaStrategies, newStrategy]);
      setIsCreateModalOpen(false);
      setIsLoading(false);
    }, 1000);
  };

  // Show loading state
  useEffect(() => {
    if (isCreateLoading) {
      setIsLoading(true);
    } else if (isCreateSuccess) {
      setIsLoading(false);
      setIsCreateModalOpen(false);
    }
  }, [isCreateLoading, isCreateSuccess]);

  if (!mounted) return null;

  return (
    <div className="space-y-6">
      {/* Header stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          className="md:col-span-2 bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <div className="flex items-start justify-between">
            <div>
              <h2 className="text-white text-xl font-bold">Investment Activity</h2>
              <p className="text-gray-400 text-sm mt-1">Historical DCA investments</p>
            </div>
            <div className="bg-indigo-500/20 p-3 rounded-full">
              <svg className="w-6 h-6 text-indigo-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 9H21M7 3V5M17 3V5M6 13H8M6 17H8M12 13H14M12 17H14M18 13H20M18 17H20M6.2 21H17.8C18.9201 21 19.4802 21 19.908 20.782C20.2843 20.5903 20.5903 20.2843 20.782 19.908C21 19.4802 21 18.9201 21 17.8V8.2C21 7.07989 21 6.51984 20.782 6.09202C20.5903 5.71569 20.2843 5.40973 19.908 5.21799C19.4802 5 18.9201 5 17.8 5H6.2C5.0799 5 4.51984 5 4.09202 5.21799C3.71569 5.40973 3.40973 5.71569 3.21799 6.09202C3 6.51984 3 7.07989 3 8.2V17.8C3 18.9201 3 19.4802 3.21799 19.908C3.40973 20.2843 3.71569 20.5903 4.09202 20.782C4.51984 21 5.07989 21 6.2 21Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-gray-400 text-sm">Total Invested</p>
              <h3 className="text-white text-2xl font-bold mt-1">{totalInvested} ETH</h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Active Strategies</p>
              <h3 className="text-white text-2xl font-bold mt-1">
                {dcaStrategies.filter(s => s.isActive).length}
              </h3>
            </div>
          </div>
          
          <InvestmentChart data={investmentHistory} />
          
          <div className="grid grid-cols-4 mt-2">
            {investmentHistory.slice(-4).map((item, index) => (
              <div key={index} className="text-center">
                <p className="text-xs text-gray-500">{item.date.split('-')[1]}/{item.date.split('-')[2]}</p>
                <p className="text-sm text-white">{item.amount} ETH</p>
              </div>
            ))}
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-white text-xl font-bold">Available Balance</h2>
          <p className="text-gray-400 text-sm mt-1">Funds available for investing</p>
          
          <div className="mt-6">
            <h3 className="text-white text-3xl font-bold">
              {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : "0.0000"} ETH
            </h3>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full mt-6 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium transition-colors"
          >
            Create New DCA Strategy
          </button>
        </motion.div>
      </div>

      {/* DCA strategies */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-bold">Your DCA Strategies</h2>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="text-sm text-indigo-500 hover:text-indigo-400 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Strategy
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {dcaStrategies.map((strategy) => (
            <DCAStrategyCard
              key={strategy.id}
              title={strategy.title}
              description={strategy.description}
              token={strategy.token}
              amount={strategy.amount}
              frequency={strategy.frequency}
              isActive={strategy.isActive}
              accentColor={strategy.accentColor}
              onManage={() => {
                // Handle managing this specific strategy
                console.log("Manage strategy", strategy.id);
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Create strategy modal */}
      <CreateDCAModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateStrategy}
        availableTokens={availableTokens}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-white">Creating your DCA strategy...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Simple version of useWaitForTransaction until we integrate wagmi properly
function useWaitForTransaction({ hash }: { hash?: `0x${string}` }) {
  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  useEffect(() => {
    if (!hash) return;
    
    setIsLoading(true);
    
    // Simulate waiting for transaction confirmation
    const timer = setTimeout(() => {
      setIsLoading(false);
      setIsSuccess(true);
    }, 2000);
    
    return () => clearTimeout(timer);
  }, [hash]);

  return { isLoading, isSuccess };
} 