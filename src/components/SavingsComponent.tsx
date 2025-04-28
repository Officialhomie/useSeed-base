"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useWriteContract, useTransaction } from "wagmi";
import { _parseEther, _formatEther } from "viem";
import { Address } from "viem";
import { motion } from "framer-motion";
import { _CONTRACT_ADDRESSES } from "@/lib/contracts";

// Savings plan card component
const SavingsPlanCard = ({
  title,
  description,
  amount,
  frequency,
  isActive,
  onManage,
  accentColor = "blue",
}: {
  title: string;
  description: string;
  amount: string;
  frequency: string;
  isActive: boolean;
  onManage: () => void;
  accentColor?: "blue" | "green" | "purple";
}) => {
  const colorClasses = {
    blue: {
      bg: "bg-blue-500/10",
      border: "border-blue-500/30",
      hoverBg: "hover:bg-blue-500/20",
      iconBg: "bg-blue-500/20",
      iconColor: "text-blue-500",
    },
    green: {
      bg: "bg-green-500/10",
      border: "border-green-500/30",
      hoverBg: "hover:bg-green-500/20",
      iconBg: "bg-green-500/20",
      iconColor: "text-green-500",
    },
    purple: {
      bg: "bg-purple-500/10",
      border: "border-purple-500/30",
      hoverBg: "hover:bg-purple-500/20",
      iconBg: "bg-purple-500/20",
      iconColor: "text-purple-500",
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
            <path d="M12 5V19M12 5L6 11M12 5L18 11" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
      
      <div className="mt-4 space-y-3">
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

// Create plan modal component
const CreatePlanModal = ({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { title: string; amount: string; frequency: string }) => void;
}) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("daily");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ title, amount, frequency });
    setTitle("");
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
          <h3 className="text-white text-lg font-semibold">Create Savings Plan</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-400 mb-1">Plan Name</label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Daily ETH Savings"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                required
              />
            </div>
            
            <div>
              <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Amount (ETH)</label>
              <input
                type="text"
                id="amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.01"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
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
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
            >
              Create Plan
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Main component
export default function SavingsComponent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [savingsPlans, setSavingsPlans] = useState<any[]>([]);
  const [totalSaved, setTotalSaved] = useState("0.00");
  const [_savingsGoal, setSavingsGoal] = useState("5.00");
  const [isLoading, setIsLoading] = useState(false);
  
  const { address, _isConnected } = useAccount();
  
  // Get ETH balance for the user
  const { data: ethBalance } = useBalance({
    address: address as Address | undefined,
  });

  // Create savings plan example contract write (this would connect to your actual contract)
  const { writeContract, data: createData } = useWriteContract();
  
  const _createSavingsPlan = (args: any) => {
    writeContract({
      address: "0x..." as Address, // Replace with your contract address
      abi: [], // Replace with your contract ABI
      functionName: 'createSavingsPlan',
      args
    });
  };
  // Wait for the transaction to complete
  const { isLoading: isCreateLoading, isSuccess: isCreateSuccess } = useTransaction({
    hash: createData,
  });

  // Handle hydration
  useEffect(() => {
    setMounted(true);
    
    // Sample data (would come from your contracts in a real app)
    setSavingsPlans([
      {
        id: 1,
        title: "Daily ETH Savings",
        description: "Automatically save a small amount daily",
        amount: "0.01 ETH",
        frequency: "Daily",
        isActive: true,
        accentColor: "blue",
      },
      {
        id: 2,
        title: "Weekly Boost",
        description: "Save a larger amount weekly",
        amount: "0.05 ETH",
        frequency: "Weekly",
        isActive: true,
        accentColor: "green",
      },
      {
        id: 3,
        title: "Monthly Investment",
        description: "Set aside a significant amount monthly",
        amount: "0.2 ETH",
        frequency: "Monthly",
        isActive: false,
        accentColor: "purple",
      },
    ]);
    
    setTotalSaved("1.45");
  }, []);

  // Handle creating a new savings plan
  const handleCreatePlan = (data: { title: string; amount: string; frequency: string }) => {
    setIsLoading(true);
    
    // In a real app, this would call your contract
    // _createSavingsPlan({
    //   args: [data.title, _parseEther(data.amount), data.frequency],
    // });
    
    // Simulating contract interaction
    setTimeout(() => {
      const newPlan = {
        id: savingsPlans.length + 1,
        title: data.title,
        description: `Save ${data.amount} ETH ${data.frequency.toLowerCase()}`,
        amount: `${data.amount} ETH`,
        frequency: data.frequency.charAt(0).toUpperCase() + data.frequency.slice(1),
        isActive: true,
        accentColor: "blue",
      };
      
      setSavingsPlans([...savingsPlans, newPlan]);
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

  const progressPercentage = Math.min(100, (parseFloat(totalSaved) / parseFloat(_savingsGoal)) * 100);

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
              <h2 className="text-white text-xl font-bold">Savings Progress</h2>
              <p className="text-gray-400 text-sm mt-1">Track your savings journey</p>
            </div>
            <div className="bg-blue-500/20 p-3 rounded-full">
              <svg className="w-6 h-6 text-blue-500" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M16 12H12V8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-6 mt-6">
            <div>
              <p className="text-gray-400 text-sm">Total Saved</p>
              <h3 className="text-white text-2xl font-bold mt-1">{totalSaved} ETH</h3>
            </div>
            <div>
              <p className="text-gray-400 text-sm">Savings Goal</p>
              <h3 className="text-white text-2xl font-bold mt-1">{_savingsGoal} ETH</h3>
            </div>
          </div>
          
          <div className="mt-6">
            <div className="flex justify-between items-center mb-2">
              <p className="text-sm text-gray-400">Progress</p>
              <span className="text-sm font-medium text-white">{progressPercentage.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500" 
                style={{ width: `${progressPercentage}%` }}
              ></div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6"
        >
          <h2 className="text-white text-xl font-bold">Available Balance</h2>
          <p className="text-gray-400 text-sm mt-1">Funds available for savings</p>
          
          <div className="mt-6">
            <h3 className="text-white text-3xl font-bold">
              {ethBalance ? parseFloat(ethBalance.formatted).toFixed(4) : "0.0000"} ETH
            </h3>
          </div>
          
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="w-full mt-6 py-3 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
          >
            Create New Savings Plan
          </button>
        </motion.div>
      </div>

      {/* Savings plans */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.2 }}
      >
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-xl font-bold">Your Savings Plans</h2>
          <button 
            onClick={() => setIsCreateModalOpen(true)}
            className="text-sm text-blue-500 hover:text-blue-400 transition-colors flex items-center"
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Plan
          </button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {savingsPlans.map((plan) => (
            <SavingsPlanCard
              key={plan.id}
              title={plan.title}
              description={plan.description}
              amount={plan.amount}
              frequency={plan.frequency}
              isActive={plan.isActive}
              accentColor={plan.accentColor}
              onManage={() => {
                // Handle managing this specific plan
                console.log("Manage plan", plan.id);
              }}
            />
          ))}
        </div>
      </motion.div>

      {/* Create plan modal */}
      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreatePlan}
      />
      
      {/* Loading overlay */}
      {isLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-white">Creating your savings plan...</p>
          </div>
        </div>
      )}
    </div>
  );
} 