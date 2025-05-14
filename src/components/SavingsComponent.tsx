"use client";

import { useState, useEffect } from "react";
import { useAccount, useBalance, useWriteContract, useReadContract, useWaitForTransactionReceipt } from "wagmi";
import { parseEther, formatEther } from "viem";
import { Address } from "viem";
import { motion } from "framer-motion";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

// Import ABIs
import DailySavingsABI from "@/ABI/DailySavings.json";
import SavingABI from "@/ABI/Saving.json";
import SavingStrategyABI from "@/ABI/SavingStrategy.json";

// Savings plan card component
const SavingsPlanCard = ({
  title,
  description,
  amount,
  frequency,
  isActive,
  onManage,
  accentColor = "blue",
  progress,
}: {
  title: string;
  description: string;
  amount: string;
  frequency: string;
  isActive: boolean;
  onManage: () => void;
  accentColor?: "blue" | "green" | "purple";
  progress?: number;
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
        
        {progress !== undefined && (
          <div className="mt-2">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-400">Progress</span>
              <span className="text-sm font-medium text-white">{Math.round(progress)}%</span>
            </div>
            <div className="w-full h-2 bg-gray-800 rounded-full overflow-hidden">
              <div 
                className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full transition-all duration-500" 
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>
        )}
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
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (data: { 
    title: string; 
    amount: string; 
    frequency: string;
    goalAmount: string;
    endDate: number;
    penalty: number;
  }) => void;
  isLoading: boolean;
}) => {
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [frequency, setFrequency] = useState("daily");
  const [goalAmount, setGoalAmount] = useState("");
  const [endDate, setEndDate] = useState("");
  const [penalty, setPenalty] = useState("50"); // Default 0.5% penalty (50 basis points)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ 
      title, 
      amount, 
      frequency, 
      goalAmount, 
      endDate: new Date(endDate).getTime() / 1000, // Convert to UNIX timestamp 
      penalty: parseInt(penalty)
    });
  };

  if (!isOpen) return null;

  // Calculate minimum end date (tomorrow)
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDate = tomorrow.toISOString().split('T')[0];

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
              <label htmlFor="amount" className="block text-sm font-medium text-gray-400 mb-1">Daily Amount (ETH)</label>
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
              <label htmlFor="goalAmount" className="block text-sm font-medium text-gray-400 mb-1">Goal Amount (ETH)</label>
              <input
                type="text"
                id="goalAmount"
                value={goalAmount}
                onChange={(e) => setGoalAmount(e.target.value)}
                placeholder="1.0"
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
            
            <div>
              <label htmlFor="endDate" className="block text-sm font-medium text-gray-400 mb-1">End Date</label>
              <input
                type="date"
                id="endDate"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                min={minDate}
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                required
              />
            </div>
            
            <div>
              <label htmlFor="penalty" className="block text-sm font-medium text-gray-400 mb-1">Early Withdrawal Penalty (basis points)</label>
              <input
                type="number"
                id="penalty"
                value={penalty}
                onChange={(e) => setPenalty(e.target.value)}
                min="0"
                max="10000"
                className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                required
              />
              <p className="text-xs text-gray-500 mt-1">100 basis points = 1%. Default: 0.5%</p>
            </div>
          </div>
          
          <div className="flex justify-end mt-6 space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-white transition-colors"
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors flex items-center"
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Creating...
                </>
              ) : 'Create Plan'}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

// Manage plan modal component
const ManagePlanModal = ({
  isOpen,
  onClose,
  plan,
  onWithdraw,
  onDisable,
  isWithdrawing,
  isDisabling,
}: {
  isOpen: boolean;
  onClose: () => void;
  plan: any;
  onWithdraw: (token: Address, amount: string) => void;
  onDisable: (token: Address) => void;
  isWithdrawing: boolean;
  isDisabling: boolean;
}) => {
  const [withdrawAmount, setWithdrawAmount] = useState("");
  
  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    onWithdraw(plan.token, withdrawAmount);
  };
  
  if (!isOpen || !plan) return null;
  
  // Parse plan's current amount for max withdrawal
  const maxWithdrawal = plan.currentAmount ? formatEther(plan.currentAmount) : "0";
  
  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900 border border-gray-800 rounded-xl p-6 w-full max-w-md"
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-white text-lg font-semibold">Manage {plan.title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </button>
        </div>
        
        <div className="space-y-4">
          <div className="bg-gray-800 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Current Savings</p>
                <p className="text-white font-medium">{maxWithdrawal} ETH</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Goal</p>
                <p className="text-white font-medium">{plan.goalAmount ? formatEther(plan.goalAmount) : "0"} ETH</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Daily Amount</p>
                <p className="text-white font-medium">{plan.dailyAmount ? formatEther(plan.dailyAmount) : "0"} ETH</p>
              </div>
              <div>
                <p className="text-gray-400 text-sm">Early Withdrawal Fee</p>
                <p className="text-white font-medium">{(plan.penaltyBps / 100).toFixed(2)}%</p>
              </div>
            </div>
            
            {plan.enabled && (
              <div className="mt-4">
                <p className="text-gray-400 text-sm">Estimated Completion</p>
                <p className="text-white font-medium">
                  {plan.estimatedCompletionDate ? new Date(plan.estimatedCompletionDate * 1000).toLocaleDateString() : "N/A"}
                </p>
              </div>
            )}
          </div>
          
          {plan.enabled && (
            <form onSubmit={handleWithdraw}>
              <div className="space-y-4">
                <div>
                  <label htmlFor="withdrawAmount" className="block text-sm font-medium text-gray-400 mb-1">Withdraw Amount (ETH)</label>
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      id="withdrawAmount"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={`Max: ${maxWithdrawal}`}
                      className="flex-1 px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
                      pattern="^[0-9]*[.,]?[0-9]*$"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setWithdrawAmount(maxWithdrawal)}
                      className="px-2 py-1 bg-gray-700 rounded-md text-sm text-white hover:bg-gray-600 transition-colors"
                    >
                      Max
                    </button>
                  </div>
                  {plan.penaltyBps > 0 && parseFloat(withdrawAmount) > 0 && (
                    <p className="text-amber-500 text-xs mt-1">
                      Early withdrawal fee: {(parseFloat(withdrawAmount) * plan.penaltyBps / 10000).toFixed(6)} ETH
                    </p>
                  )}
                </div>
                
                <button
                  type="submit"
                  className="w-full py-2 px-4 bg-amber-600 hover:bg-amber-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
                  disabled={isWithdrawing || parseFloat(withdrawAmount) <= 0 || parseFloat(withdrawAmount) > parseFloat(maxWithdrawal)}
                >
                  {isWithdrawing ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : 'Withdraw Funds'}
                </button>
              </div>
            </form>
          )}
          
          <div className="border-t border-gray-800 pt-4">
            <button
              onClick={() => onDisable(plan.token)}
              className="w-full py-2 px-4 bg-red-600 hover:bg-red-500 text-white rounded-lg font-medium transition-colors flex items-center justify-center"
              disabled={isDisabling || !plan.enabled}
            >
              {isDisabling ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white mr-2"></div>
                  Processing...
                </>
              ) : plan.enabled ? 'Disable Plan' : 'Plan Disabled'}
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

// Main component
export default function SavingsComponent() {
  const [mounted, setMounted] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<any>(null);
  const [savingsPlans, setSavingsPlans] = useState<any[]>([]);
  const [totalSaved, setTotalSaved] = useState("0.00");
  const [savingsGoal, setSavingsGoal] = useState("5.00");
  const [isLoading, setIsLoading] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [isDisabling, setIsDisabling] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { address, isConnected } = useAccount();
  
  // Get ETH balance for the user
  const { data: ethBalance } = useBalance({
    address: address as Address | undefined,
  });

  // Define the addresses of your contracts
  const DAILY_SAVINGS_ADDRESS = CONTRACT_ADDRESSES.DAILY_SAVINGS;
  const ETH_ADDRESS = CONTRACT_ADDRESSES.ETH;
  
  // Contract write hooks
  const { writeContract, data: writeData, error: writeError } = useWriteContract();
  
  // Track transaction status
  const { isLoading: isTransactionLoading, isSuccess: isTransactionSuccess } = 
    useWaitForTransactionReceipt({ hash: writeData });
  
  // Read contract for getting savings data
  const { data: userSavingPlans, refetch: refetchSavingsPlans } = useReadContract({
    address: DAILY_SAVINGS_ADDRESS,
    abi: DailySavingsABI,
    functionName: 'getDailySavingsStatus',
    args: [address, ETH_ADDRESS],
    query: { enabled: !!address && mounted },
  });

  // Function to fetch all savings plans for the user
  const fetchAllSavingsPlans = async () => {
    if (!address || !mounted) return;
    
    try {
      // First, retrieve the tokens for which the user has savings plans
      const tokens = [ETH_ADDRESS];
      
      const plans: any[] = [];
      let totalSavedAmount = 0;
      
      for (const token of tokens) {
        try {
          const planData = await fetchSavingsPlan(token);
          if (planData && planData.enabled) {
            const currentAmount = parseFloat(formatEther(planData.currentAmount));
            const goalAmount = parseFloat(formatEther(planData.goalAmount));
            const progress = (currentAmount / goalAmount) * 100;
            
            plans.push({
              id: plans.length + 1,
              token,
              title: `${getFrequencyName(planData)} ETH Savings`,
              description: `Automatically save ${formatEther(planData.dailyAmount)} ETH ${getFrequencyName(planData).toLowerCase()}`,
              amount: `${formatEther(planData.dailyAmount)} ETH`,
              frequency: getFrequencyName(planData),
              isActive: planData.enabled,
              accentColor: getColorForPlan(planData),
              currentAmount: planData.currentAmount,
              goalAmount: planData.goalAmount,
              dailyAmount: planData.dailyAmount,
              penaltyBps: planData.penaltyBps,
              estimatedCompletionDate: planData.estimatedCompletionDate,
              progress
            });
            
            totalSavedAmount += currentAmount;
          }
        } catch (err) {
          console.error(`Error fetching savings plan for token ${token}:`, err);
          setError(`Failed to load savings plan for ${token}`);
        }
      }
      
      setSavingsPlans(plans);
      setTotalSaved(totalSavedAmount.toFixed(4));
      
    } catch (err) {
      console.error("Error fetching savings plans:", err);
      setError("Failed to load your savings plans");
    }
  };
  
  // Helper function to fetch a single savings plan
  const fetchSavingsPlan = async (token: Address) => {
    try {
      const result = await refetchSavingsPlans();
      if (result.data && Array.isArray(result.data)) {
        const [
          enabled,
          dailyAmount,
          goalAmount,
          currentAmount,
          remainingAmount,
          penaltyAmount,
          estimatedCompletionDate
        ] = result.data;
        
        return {
          enabled,
          dailyAmount,
          goalAmount,
          currentAmount,
          remainingAmount,
          penaltyBps: penaltyAmount,
          estimatedCompletionDate,
          token
        };
      }
      return null;
    } catch (err) {
      console.error(`Error fetching plan for token ${token}:`, err);
      throw err;
    }
  };
  
  // Helper function to determine frequency name based on config
  const getFrequencyName = (plan: any) => {
    // This is a simplification - in a real app, you'd determine this from contract data
    return "Daily";
  };
  
  // Helper function to determine color based on plan type/progress
  const getColorForPlan = (plan: any) => {
    const progress = parseFloat(formatEther(plan.currentAmount)) / parseFloat(formatEther(plan.goalAmount)) * 100;
    if (progress > 75) return "green";
    if (progress > 30) return "blue";
    return "purple";
  };
  
  // Handle creating a new savings plan
  const handleCreatePlan = async (data: { 
    title: string; 
    amount: string; 
    frequency: string;
    goalAmount: string;
    endDate: number;
    penalty: number;
  }) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const dailyAmount = parseEther(data.amount);
      const goalAmount = parseEther(data.goalAmount);
      const endTime = Math.floor(data.endDate); // Unix timestamp
      
      // Call contract function to create savings plan
      writeContract({
        address: DAILY_SAVINGS_ADDRESS,
        abi: DailySavingsABI,
        functionName: 'configureDailySavings',
        args: [address, ETH_ADDRESS, dailyAmount, goalAmount, data.penalty, endTime]
      });
      
    } catch (err) {
      console.error("Error creating savings plan:", err);
      setError("Failed to create savings plan. Please try again.");
      setIsLoading(false);
    }
  };
  
  // Handle withdrawing from a savings plan
  const handleWithdraw = async (token: Address, amount: string) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsWithdrawing(true);
    setError(null);
    
    try {
      const withdrawAmount = parseEther(amount);
      
      // Call contract function to withdraw savings
      writeContract({
        address: DAILY_SAVINGS_ADDRESS,
        abi: DailySavingsABI,
        functionName: 'withdrawDailySavings',
        args: [address, token, withdrawAmount]
      });
      
    } catch (err) {
      console.error("Error withdrawing savings:", err);
      setError("Failed to withdraw savings. Please try again.");
      setIsWithdrawing(false);
    }
  };
  
  // Handle disabling a savings plan
  const handleDisablePlan = async (token: Address) => {
    if (!address) {
      setError("Please connect your wallet first");
      return;
    }
    
    setIsDisabling(true);
    setError(null);
    
    try {
      // Call contract function to disable savings plan
      writeContract({
        address: DAILY_SAVINGS_ADDRESS,
        abi: DailySavingsABI,
        functionName: 'disableDailySavings',
        args: [address, token]
      });
      
    } catch (err) {
      console.error("Error disabling savings plan:", err);
      setError("Failed to disable savings plan. Please try again.");
      setIsDisabling(false);
    }
  };
  
  // Handle managing a specific plan
  const handleManagePlan = (plan: any) => {
    setSelectedPlan(plan);
    setIsManageModalOpen(true);
  };

  // Monitor transaction status
  useEffect(() => {
    if (isTransactionSuccess) {
      // On successful transaction, close modals and reset states
      setIsLoading(false);
      setIsWithdrawing(false);
      setIsDisabling(false);
      setIsCreateModalOpen(false);
      setIsManageModalOpen(false);
      
      // Refetch user savings plans
      fetchAllSavingsPlans();
    }
  }, [isTransactionSuccess]);
  
  // Handle errors
  useEffect(() => {
    if (writeError) {
      console.error("Transaction error:", writeError);
      setError("Transaction failed. Please try again.");
      setIsLoading(false);
      setIsWithdrawing(false);
      setIsDisabling(false);
    }
  }, [writeError]);

  // Initial data fetch
  useEffect(() => {
    setMounted(true);
    
    if (address && mounted) {
      fetchAllSavingsPlans();
      
      // Calculate global savings goal (in a real app, this might come from user settings)
      setSavingsGoal("5.00");
    }
  }, [address, mounted]);

  if (!mounted) return null;

  const progressPercentage = Math.min(100, (parseFloat(totalSaved) / parseFloat(savingsGoal)) * 100);

  return (
    <div className="space-y-6">
      {/* Error banner */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 text-red-500 p-4 rounded-xl mb-4 flex items-start">
          <svg className="w-5 h-5 mr-2 mt-0.5 flex-shrink-0" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <div>
            <p>{error}</p>
            <button 
              onClick={() => setError(null)} 
              className="text-sm text-red-400 hover:text-red-300 mt-1"
            >
              Dismiss
            </button>
          </div>
        </div>
      )}
      
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
              <h3 className="text-white text-2xl font-bold mt-1">{savingsGoal} ETH</h3>
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
            disabled={!isConnected}
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
            disabled={!isConnected}
          >
            <svg className="w-4 h-4 mr-1" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M12 5V19M5 12H19" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            New Plan
          </button>
        </div>
        
        {savingsPlans.length === 0 ? (
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-8 text-center">
            <div className="bg-gray-800 p-4 inline-flex rounded-full mb-4">
              <svg className="w-8 h-8 text-gray-400" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M12 22C17.5228 22 22 17.5228 22 12C22 6.47715 17.5228 2 12 2C6.47715 2 2 6.47715 2 12C2 17.5228 6.47715 22 12 22Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 8V12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                <path d="M12 16H12.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h3 className="text-white text-lg font-semibold">No Savings Plans Yet</h3>
            <p className="text-gray-400 mt-2">Create your first savings plan to start building your savings automatically.</p>
            <button 
              onClick={() => setIsCreateModalOpen(true)}
              className="mt-6 py-2 px-4 rounded-lg bg-blue-600 hover:bg-blue-500 text-white font-medium transition-colors"
              disabled={!isConnected}
            >
              Create Your First Plan
            </button>
          </div>
        ) : (
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
                progress={plan.progress}
                onManage={() => handleManagePlan(plan)}
              />
            ))}
          </div>
        )}
      </motion.div>

      {/* Create plan modal */}
      <CreatePlanModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSave={handleCreatePlan}
        isLoading={isLoading || isTransactionLoading}
      />
      
      {/* Manage plan modal */}
      <ManagePlanModal
        isOpen={isManageModalOpen}
        onClose={() => setIsManageModalOpen(false)}
        plan={selectedPlan}
        onWithdraw={handleWithdraw}
        onDisable={handleDisablePlan}
        isWithdrawing={isWithdrawing || isTransactionLoading}
        isDisabling={isDisabling || isTransactionLoading}
      />
      
      {/* Loading overlay */}
      {(isLoading || isWithdrawing || isDisabling) && isTransactionLoading && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 flex items-center space-x-4">
            <div className="animate-spin rounded-full h-8 w-8 border-t-2 border-b-2 border-blue-500"></div>
            <p className="text-white">Processing transaction...</p>
          </div>
        </div>
      )}
    </div>
  );
} 