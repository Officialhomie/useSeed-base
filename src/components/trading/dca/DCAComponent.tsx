"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useAccount, useBalance } from "wagmi";
import { Address } from "viem";
import DCATickStrategy from "@/components/trading/dca/DCATickStrategy";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import useDCAManagement from "@/lib/hooks/useDCAManagement";
import { useNotification } from "@/components/core/NotificationManager";

// Enhanced DCA strategy type
type DCAStrategy = {
  id: number;
  title: string;
  description: string;
  fromToken: string;
  toToken: string;
  amount: string;
  executionTick: number;
  deadline: Date;
  isActive: boolean;
  executed: boolean;
  customSlippageTolerance: number;
  accentColor: "indigo" | "purple" | "emerald";
};

// Production-ready DCA Component
export default function DCAComponent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [totalInvested, setTotalInvested] = useState("0.00");
  const [isLoading, setIsLoading] = useState(false);
  
  const { address } = useAccount();
  const { addNotification } = useNotification();
  
  // Real DCA management integration
  const { 
    dcaEnabled, 
    dcaTargetToken,
    dcaQueueItems,
    isLoading: dcaLoading,
    error: dcaError,
    enableDCA,
    disableDCA,
    setDCATickStrategy,
    executeQueuedDCAs,
    executeSpecificDCA
  } = useDCAManagement();

  // Get ETH balance
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

  // Convert queue items to display strategies
  const [dcaStrategies, setDcaStrategies] = useState<DCAStrategy[]>([]);

  // Handle hydration and data loading
  useEffect(() => {
    setMounted(true);
  }, []);

  // Convert real queue items to display format
  useEffect(() => {
    if (dcaQueueItems && dcaQueueItems.length > 0) {
      const strategies = dcaQueueItems.map((item, index) => {
        const fromTokenInfo = availableTokens.find(t => t.address === item.fromToken);
        const toTokenInfo = availableTokens.find(t => t.address === item.toToken);
        
        return {
          id: index,
          title: `DCA ${fromTokenInfo?.symbol || 'Unknown'} → ${toTokenInfo?.symbol || 'Unknown'}`,
          description: `Convert ${parseFloat(item.amount.toString()) / 1e18} ${fromTokenInfo?.symbol} to ${toTokenInfo?.symbol}`,
          fromToken: fromTokenInfo?.symbol || 'Unknown',
          toToken: toTokenInfo?.symbol || 'Unknown',
          amount: `${parseFloat(item.amount.toString()) / 1e18} ${fromTokenInfo?.symbol}`,
          executionTick: item.executionTick,
          deadline: new Date(Number(item.deadline) * 1000),
          isActive: !item.executed,
          executed: item.executed,
          customSlippageTolerance: item.customSlippageTolerance,
          accentColor: (index % 3 === 0 ? "indigo" : index % 3 === 1 ? "purple" : "emerald") as "indigo" | "purple" | "emerald",
        };
      });
      setDcaStrategies(strategies);
      
      // Calculate total invested
      const total = strategies.reduce((sum, strategy) => {
        return sum + parseFloat(strategy.amount.split(' ')[0]);
      }, 0);
      setTotalInvested(total.toFixed(4));
    } else {
      setDcaStrategies([]);
      setTotalInvested("0.00");
    }
  }, [dcaQueueItems]);

  // Production-ready strategy creation
  const handleCreateStrategy = async (data: { 
    title: string; 
    token: string; 
    amount: string; 
    frequency: string;
    tickStrategy?: any;
  }) => {
    if (!address) {
      addNotification({
        type: 'error',
        title: 'Wallet Not Connected',
        message: 'Please connect your wallet to create a DCA strategy.'
      });
      return;
    }

    setIsLoading(true);
    
    try {
      // Input validation
      const amountNum = parseFloat(data.amount);
      if (isNaN(amountNum) || amountNum <= 0) {
        throw new Error('Invalid amount specified');
      }

      const targetToken = availableTokens.find(t => t.symbol === data.token);
      if (!targetToken) {
        throw new Error('Invalid target token selected');
      }

      // Step 1: Enable DCA with target token
      console.log('Enabling DCA for target token:', targetToken.address);
      await enableDCA(targetToken.address as Address);

      // Step 2: Set tick strategy if provided
      if (data.tickStrategy) {
        console.log('Setting DCA tick strategy:', data.tickStrategy);
        await setDCATickStrategy(
          data.tickStrategy.tickDelta,
          data.tickStrategy.tickExpiryTime * 3600, // Convert hours to seconds
          data.tickStrategy.onlyImprovePrice,
          data.tickStrategy.minTickImprovement,
          data.tickStrategy.dynamicSizing
        );
      }

      addNotification({
        type: 'success',
        title: 'DCA Strategy Created',
        message: `Successfully created DCA strategy for ${data.token}`
      });

      setIsCreateModalOpen(false);
      
    } catch (error) {
      console.error("Error creating DCA strategy:", error);
      addNotification({
        type: 'error',
        title: 'Strategy Creation Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual execution handler
  const handleExecuteStrategy = async (strategy: DCAStrategy) => {
    if (!address) return;

    try {
      setIsLoading(true);
      
      const fromToken = availableTokens.find(t => t.symbol === strategy.fromToken);
      if (!fromToken) throw new Error('Invalid from token');

      // Execute specific DCA
      await executeSpecificDCA(
        fromToken.address as Address,
        BigInt(Math.floor(parseFloat(strategy.amount.split(' ')[0]) * 1e18)),
        strategy.customSlippageTolerance
      );

      addNotification({
        type: 'success',
        title: 'DCA Executed',
        message: `Successfully executed ${strategy.title}`
      });

    } catch (error) {
      console.error("Error executing DCA:", error);
      addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: error instanceof Error ? error.message : 'Unknown error occurred'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Execute all queued DCAs
  const handleExecuteAllQueued = async () => {
    if (!address) return;

    try {
      setIsLoading(true);
      await executeQueuedDCAs();
      
      addNotification({
        type: 'success',
        title: 'All DCAs Executed',
        message: 'Successfully executed all queued DCA strategies'
      });

    } catch (error) {
      console.error("Error executing queued DCAs:", error);
      addNotification({
        type: 'error',
        title: 'Execution Failed',
        message: error instanceof Error ? error.message : 'Failed to execute queued DCAs'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Show error state
  if (dcaError) {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="bg-red-900/20 border border-red-800/40 rounded-xl p-4 text-center">
          <h3 className="text-red-400 font-medium mb-2">DCA Loading Error</h3>
          <p className="text-red-300 text-sm">{dcaError.message}</p>
          <button 
            onClick={() => window.location.reload()}
            className="mt-3 px-4 py-2 bg-red-600 text-white rounded-lg text-sm"
          >
            Reload Page
          </button>
        </div>
      </div>
    );
  }

  if (!mounted || dcaLoading) {
    return (
      <div className="w-full max-w-md mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-700 rounded mb-6"></div>
          <div className="h-40 bg-gray-800 rounded mb-4"></div>
          <div className="h-40 bg-gray-800 rounded"></div>
        </div>
      </div>
    );
  }

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
              <h2 className="text-white text-xl font-bold">DCA Activity</h2>
              <p className="text-gray-400 text-sm mt-1">
                {dcaEnabled ? 'DCA is enabled' : 'DCA is disabled'}
              </p>
            </div>
            <div className="bg-indigo-500/20 p-3 rounded-full">
              <svg className="w-6 h-6 text-indigo-500" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6M12 6L17 11M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
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

          {/* Queue management controls */}
          {dcaStrategies.length > 0 && (
            <div className="mt-6 pt-4 border-t border-gray-800">
              <div className="flex justify-between items-center">
                <span className="text-gray-400 text-sm">Queue Management</span>
                <button
                  onClick={handleExecuteAllQueued}
                  disabled={isLoading || dcaStrategies.filter(s => s.isActive).length === 0}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm rounded-lg transition-colors"
                >
                  {isLoading ? 'Executing...' : 'Execute All Queued'}
                </button>
              </div>
            </div>
          )}
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-white text-xl font-bold">Available Balance</h2>
          <p className="text-gray-400 text-sm mt-1">Funds available for DCA</p>
          
          <div className="mt-6">
            <h3 className="text-white text-3xl font-bold">
              {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : "0.0000"} ETH
            </h3>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            disabled={!address}
            className="w-full mt-6 py-3 px-4 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-colors"
          >
            {address ? 'Create New DCA Strategy' : 'Connect Wallet'}
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
            disabled={!address}
            className="text-sm text-indigo-500 hover:text-indigo-400 disabled:text-gray-500 disabled:cursor-not-allowed transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Strategy
          </button>
        </div>
        
        {dcaStrategies.length === 0 ? (
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-8 text-center">
            <div className="text-gray-400 mb-4">
              <svg className="w-16 h-16 mx-auto mb-4 opacity-50" viewBox="0 0 24 24" fill="none">
                <path d="M7 11L12 6M12 6L17 11M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-white text-lg font-medium mb-2">No DCA Strategies</h3>
            <p className="text-gray-400 text-sm mb-6">Create your first dollar-cost averaging strategy to start building your portfolio systematically.</p>
            <button
              onClick={() => setIsCreateModalOpen(true)}
              disabled={!address}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
            >
              {address ? 'Create Your First Strategy' : 'Connect Wallet'}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {dcaStrategies.map((strategy) => (
              <DCAStrategyCard
                key={strategy.id}
                strategy={strategy}
                onExecute={() => handleExecuteStrategy(strategy)}
                isLoading={isLoading}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Create strategy modal */}
      <CreateDCAModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreateStrategy}
        availableTokens={availableTokens}
        isLoading={isLoading}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-indigo-500"></div>
            <p className="text-white">Processing DCA operation...</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Enhanced DCA Strategy Card Component
const DCAStrategyCard = ({
  strategy,
  onExecute,
  isLoading,
}: {
  strategy: DCAStrategy;
  onExecute: () => void;
  isLoading: boolean;
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

  const colors = colorClasses[strategy.accentColor];
  const isExpired = strategy.deadline < new Date();
  const canExecute = strategy.isActive && !strategy.executed && !isExpired;

  return (
    <div className={`${colors.bg} ${colors.border} ${colors.hoverBg} border rounded-xl p-6 transition-colors`}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-white font-semibold text-lg">{strategy.title}</h3>
          <p className="text-gray-400 text-sm mt-1">{strategy.description}</p>
        </div>
        <div className={`w-10 h-10 rounded-full ${colors.iconBg} flex items-center justify-center`}>
          <svg className={`w-5 h-5 ${colors.iconColor}`} viewBox="0 0 24 24" fill="none">
            <path d="M7 11L12 6M12 6L17 11M12 6V18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">From → To</span>
          <span className="text-white font-medium">{strategy.fromToken} → {strategy.toToken}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Amount</span>
          <span className="text-white font-medium">{strategy.amount}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Execution Tick</span>
          <span className="text-white font-medium">{strategy.executionTick}</span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Deadline</span>
          <span className="text-white font-medium text-xs">
            {strategy.deadline.toLocaleDateString()}
          </span>
        </div>
        <div className="flex justify-between items-center">
          <span className="text-gray-400 text-sm">Status</span>
          <div className="flex items-center">
            <div className={`w-2 h-2 rounded-full mr-2 ${
              strategy.executed ? "bg-green-500" : 
              isExpired ? "bg-red-500" : 
              strategy.isActive ? "bg-blue-500" : "bg-gray-500"
            }`}></div>
            <span className="text-white font-medium text-sm">
              {strategy.executed ? "Completed" : 
               isExpired ? "Expired" : 
               strategy.isActive ? "Active" : "Inactive"}
            </span>
          </div>
        </div>
      </div>
      
      <div className="flex space-x-2 mt-6">
        {canExecute && (
          <button 
            onClick={onExecute}
            disabled={isLoading}
            className="flex-1 py-2.5 px-4 rounded-lg bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium transition-colors text-sm"
          >
            {isLoading ? 'Executing...' : 'Execute Now'}
          </button>
        )}
        <button 
          onClick={() => {/* TODO: Implement strategy management */}}
          className="flex-1 py-2.5 px-4 rounded-lg bg-gray-800 hover:bg-gray-700 text-white font-medium transition-colors text-sm"
        >
          Manage
        </button>
      </div>
    </div>
  );
};

// Enhanced Create DCA Modal Component
const CreateDCAModal = ({
  isOpen,
  onClose,
  onSave,
  availableTokens,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; token: string; amount: string; frequency: string; tickStrategy?: any }) => void;
  availableTokens: { symbol: string; name: string; address: string }[];
  isLoading: boolean;
}) => {
  const [title, setTitle] = useState("");
  const [selectedToken, setSelectedToken] = useState(availableTokens[0]?.symbol || "");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [showTickStrategy, setShowTickStrategy] = useState(false);
  const [tickStrategy, setTickStrategy] = useState<any>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!title.trim()) {
      alert('Please enter a strategy title');
      return;
    }
    if (!amount || parseFloat(amount) <= 0) {
      alert('Please enter a valid amount');
      return;
    }
    
    onSave({ 
      title: title.trim(), 
      token: selectedToken, 
      amount, 
      frequency,
      tickStrategy
    });
    
    // Reset form
    setTitle("");
    setSelectedToken(availableTokens[0]?.symbol || "");
    setAmount("");
    setFrequency("daily");
    setTickStrategy(null);
  };

  const handleTickStrategySave = (strategyData: any) => {
    setTickStrategy(strategyData);
    setShowTickStrategy(false);
  };

  const handleTickStrategyCancel = () => {
    setShowTickStrategy(false);
  };

  if (!isOpen) return null;

  if (showTickStrategy) {
    return (
      <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
        <div className="w-full max-w-2xl">
          <DCATickStrategy 
            onSave={handleTickStrategySave} 
            onCancel={handleTickStrategyCancel}
          />
        </div>
      </div>
    );
  }

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
          <button 
            onClick={onClose} 
            disabled={isLoading}
            className="text-gray-400 hover:text-white disabled:cursor-not-allowed"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Strategy Name</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="My DCA Strategy"
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:border-indigo-500 focus:outline-none"
                required
                disabled={isLoading}
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Target Token</label>
              <select
                value={selectedToken}
                onChange={(e) => setSelectedToken(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:border-indigo-500 focus:outline-none"
                required
                disabled={isLoading}
              >
                {availableTokens.map((token) => (
                  <option key={token.address} value={token.symbol}>
                    {token.name} ({token.symbol})
                  </option>
                ))}
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Amount (per execution)</label>
              <div className="flex">
                <input
                  type="number"
                  step="0.000001"
                  min="0"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-gray-800 border border-gray-700 rounded-l-lg p-2.5 text-white focus:border-indigo-500 focus:outline-none"
                  required
                  disabled={isLoading}
                />
                <span className="bg-gray-700 text-white px-3 rounded-r-lg flex items-center">
                  ETH
                </span>
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">Frequency</label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value)}
                className="w-full bg-gray-800 border border-gray-700 rounded-lg p-2.5 text-white focus:border-indigo-500 focus:outline-none"
                required
                disabled={isLoading}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </div>
            
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowTickStrategy(true)}
                disabled={isLoading}
                className="text-blue-500 hover:text-blue-400 disabled:text-gray-500 disabled:cursor-not-allowed text-sm flex items-center"
              >
                <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none">
                  <path d="M12 6V12M12 12V18M12 12H18M12 12H6" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Configure Advanced Tick Strategy
              </button>
              
              {tickStrategy && (
                <div className="mt-2 p-2 bg-blue-900/20 border border-blue-800/30 rounded-lg">
                  <div className="text-xs text-blue-400">Advanced tick strategy configured</div>
                  <div className="text-xs text-gray-400 mt-1">
                    Tick Delta: {tickStrategy.tickDelta}, 
                    Max Wait: {Math.round(tickStrategy.tickExpiryTime / 3600)}h
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              disabled={isLoading}
              className="px-4 py-2 bg-gray-800 hover:bg-gray-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors flex items-center"
            >
              {isLoading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Creating...
                </>
              ) : (
                'Create Strategy'
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};