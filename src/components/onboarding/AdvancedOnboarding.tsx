"use client";

import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";

// Types
type Strategy = {
  id: string;
  name: string;
  description: string;
  riskLevel: "conservative" | "balanced" | "aggressive";
  expectedReturn: number;
  allocationPercentages: {
    [key: string]: number;
  };
  recommendedFor: string[];
  timeframe: number; // in months
};

type UserData = {
  savingsGoal: string;
  savingsFrequency: "daily" | "weekly" | "monthly";
  savingsAmount: string;
  targetToken: `0x${string}`;
  riskTolerance: "conservative" | "balanced" | "aggressive";
  selectedSubscription: string;
};

// Helper function to generate strategies based on user inputs
const generateRecommendedStrategies = (
  savingsGoal: number,
  riskTolerance: string,
  savingsFrequency: string
): Strategy[] => {
  // Base strategies
  const strategies: Strategy[] = [
    {
      id: "conservative-yield",
      name: "Conservative Yield",
      description: "Lower risk strategy focused on stable, predictable returns",
      riskLevel: "conservative",
      expectedReturn: 3.5,
      allocationPercentages: {
        [CONTRACT_ADDRESSES.ETH]: 20,
        [CONTRACT_ADDRESSES.USDC]: 70,
        [CONTRACT_ADDRESSES.WETH]: 10,
      },
      recommendedFor: ["Beginners", "Short-term goals", "Capital preservation"],
      timeframe: 6,
    },
    {
      id: "balanced-growth",
      name: "Balanced Growth",
      description: "Moderate risk with balanced growth and yield opportunities",
      riskLevel: "balanced",
      expectedReturn: 8.0,
      allocationPercentages: {
        [CONTRACT_ADDRESSES.ETH]: 50,
        [CONTRACT_ADDRESSES.USDC]: 30,
        [CONTRACT_ADDRESSES.WETH]: 20,
      },
      recommendedFor: ["Experienced users", "Medium-term goals", "Growth focus"],
      timeframe: 12,
    },
    {
      id: "aggressive-growth",
      name: "Aggressive Growth",
      description: "Higher risk strategy aiming for maximum growth potential",
      riskLevel: "aggressive",
      expectedReturn: 15.0,
      allocationPercentages: {
        [CONTRACT_ADDRESSES.ETH]: 70,
        [CONTRACT_ADDRESSES.USDC]: 10,
        [CONTRACT_ADDRESSES.WETH]: 20,
      },
      recommendedFor: ["Experienced users", "Long-term goals", "Maximum growth"],
      timeframe: 24,
    },
  ];

  // Filter strategies based on risk tolerance
  let filteredStrategies = strategies;
  
  if (riskTolerance === "conservative") {
    filteredStrategies = strategies.filter(s => s.riskLevel === "conservative");
  } else if (riskTolerance === "balanced") {
    filteredStrategies = strategies.filter(s => s.riskLevel === "balanced" || s.riskLevel === "conservative");
  }

  // Adjust expected returns based on frequency
  return filteredStrategies.map(strategy => ({
    ...strategy,
    expectedReturn: strategy.expectedReturn * 
      (savingsFrequency === "daily" ? 1.2 : 
       savingsFrequency === "weekly" ? 1.1 : 1.0)
  }));
};

// Strategy selection card component
const StrategySelectionCard = ({
  strategy,
  isSelected,
  onSelect,
}: {
  strategy: Strategy;
  isSelected: boolean;
  onSelect: () => void;
}) => {
  const riskColors = {
    conservative: "from-green-500 to-blue-500",
    balanced: "from-blue-500 to-purple-500",
    aggressive: "from-orange-500 to-red-500",
  };

  return (
    <div
      className={`rounded-xl p-6 cursor-pointer transition-all duration-300 ${
        isSelected
          ? "border-2 border-blue-500 bg-blue-900/20 shadow-lg shadow-blue-500/10"
          : "border border-gray-800 bg-gray-900/60 hover:border-gray-700"
      }`}
      onClick={onSelect}
    >
      <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${riskColors[strategy.riskLevel]} mb-4`}></div>
      <h3 className="text-xl font-bold mb-2">{strategy.name}</h3>
      <p className="text-gray-400 text-sm mb-4">{strategy.description}</p>
      
      <div className="flex justify-between mb-4">
        <div>
          <p className="text-xs text-gray-500">Expected Return</p>
          <p className="text-lg font-bold text-green-500">+{strategy.expectedReturn.toFixed(1)}%</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">Risk Level</p>
          <p className="text-lg font-bold capitalize">{strategy.riskLevel}</p>
        </div>
      </div>
      
      <div className="mb-4">
        <p className="text-xs text-gray-500 mb-2">Asset Allocation</p>
        <div className="w-full h-6 rounded-full overflow-hidden flex">
          {Object.entries(strategy.allocationPercentages).map(([token, percentage], index) => {
            const colors = ["bg-blue-500", "bg-green-500", "bg-purple-500"];
            const tokenName = token === CONTRACT_ADDRESSES.ETH ? "ETH" : 
                             token === CONTRACT_ADDRESSES.USDC ? "USDC" : "WETH";
            
            return (
              <div
                key={token}
                className={`${colors[index % colors.length]} h-full`}
                style={{ width: `${percentage}%` }}
                title={`${tokenName}: ${percentage}%`}
              />
            );
          })}
        </div>
        <div className="flex justify-between mt-1 text-xs text-gray-500">
          {Object.entries(strategy.allocationPercentages).map(([token, percentage]) => {
            const tokenName = token === CONTRACT_ADDRESSES.ETH ? "ETH" : 
                             token === CONTRACT_ADDRESSES.USDC ? "USDC" : "WETH";
            return (
              <span key={token}>{tokenName}: {percentage}%</span>
            );
          })}
        </div>
      </div>
      
      <div>
        <p className="text-xs text-gray-500 mb-1">Recommended For</p>
        <div className="flex flex-wrap gap-1">
          {strategy.recommendedFor.map((item) => (
            <span
              key={item}
              className="text-xs px-2 py-1 rounded-full bg-gray-800 text-gray-300"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
};

// Projected outcomes chart component
const ProjectedOutcomesChart = ({
  selectedStrategy,
  timeframe,
  initialInvestment,
  monthlyContribution,
}: {
  selectedStrategy: Strategy | null;
  timeframe: number;
  initialInvestment: number;
  monthlyContribution: number;
}) => {
  if (!selectedStrategy) return null;

  // Calculate projected growth
  const monthlyRate = selectedStrategy.expectedReturn / 100 / 12;
  const projectedData = Array.from({ length: timeframe + 1 }).map((_, month) => {
    let value = initialInvestment;
    for (let i = 0; i < month; i++) {
      value = value * (1 + monthlyRate) + monthlyContribution;
    }
    return {
      month,
      value: Math.round(value * 100) / 100,
    };
  });

  const maxValue = Math.max(...projectedData.map(d => d.value));
  const height = 200;

  return (
    <div className="mt-6 p-4 bg-gray-900/60 rounded-xl border border-gray-800">
      <h3 className="text-lg font-semibold mb-4">Projected Growth Over Time</h3>
      
      <div className="relative h-60">
        {/* Y-axis labels */}
        <div className="absolute left-0 top-0 bottom-0 w-12 flex flex-col justify-between text-xs text-gray-500">
          <span>${maxValue.toFixed(0)}</span>
          <span>${(maxValue / 2).toFixed(0)}</span>
          <span>$0</span>
        </div>
        
        {/* Chart area */}
        <div className="absolute left-14 right-0 top-0 bottom-0">
          {/* Chart lines */}
          <div className="absolute left-0 right-0 top-0 h-px bg-gray-800"></div>
          <div className="absolute left-0 right-0 top-1/2 h-px bg-gray-800"></div>
          <div className="absolute left-0 right-0 bottom-0 h-px bg-gray-800"></div>
          
          {/* Area chart */}
          <svg className="w-full h-full" viewBox={`0 0 ${timeframe} ${height}`} preserveAspectRatio="none">
            <defs>
              <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={selectedStrategy.riskLevel === "conservative" ? "#10B981" : 
                                          selectedStrategy.riskLevel === "balanced" ? "#3B82F6" : 
                                          "#F59E0B"} stopOpacity="0.3" />
                <stop offset="100%" stopColor={selectedStrategy.riskLevel === "conservative" ? "#10B981" : 
                                             selectedStrategy.riskLevel === "balanced" ? "#3B82F6" : 
                                             "#F59E0B"} stopOpacity="0" />
              </linearGradient>
            </defs>
            
            {/* Area fill */}
            <path
              d={`
                M0,${height}
                ${projectedData.map(d => `L${d.month},${height - (d.value / maxValue) * height}`).join(" ")}
                L${timeframe},${height}
                Z
              `}
              fill="url(#areaGradient)"
            />
            
            {/* Line */}
            <path
              d={`
                M0,${height - (projectedData[0].value / maxValue) * height}
                ${projectedData.map(d => `L${d.month},${height - (d.value / maxValue) * height}`).join(" ")}
              `}
              fill="none"
              stroke={selectedStrategy.riskLevel === "conservative" ? "#10B981" : 
                      selectedStrategy.riskLevel === "balanced" ? "#3B82F6" : 
                      "#F59E0B"}
              strokeWidth="2"
            />
          </svg>
          
          {/* X-axis labels */}
          <div className="absolute left-0 right-0 bottom-0 flex justify-between translate-y-6 text-xs text-gray-500">
            <span>Now</span>
            <span>{Math.floor(timeframe / 2)} months</span>
            <span>{timeframe} months</span>
          </div>
        </div>
      </div>
      
      <div className="mt-10 grid grid-cols-3 gap-4 text-center">
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">Initial</p>
          <p className="text-lg font-bold">${initialInvestment}</p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">Expected Final</p>
          <p className="text-lg font-bold">${projectedData[timeframe].value.toFixed(2)}</p>
        </div>
        <div className="p-3 bg-gray-800/50 rounded-lg">
          <p className="text-xs text-gray-400">Projected Gain</p>
          <p className="text-lg font-bold text-green-500">
            +${(projectedData[timeframe].value - initialInvestment - (monthlyContribution * timeframe)).toFixed(2)}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main component
const AdvancedOnboarding = ({ 
  formData, 
  onStrategySelect,
  currentStep
}: { 
  formData: UserData; 
  onStrategySelect: (strategy: Strategy) => void;
  currentStep: number;
}) => {
  const [selectedStrategyId, setSelectedStrategyId] = useState<string | null>(null);
  const [strategies, setStrategies] = useState<Strategy[]>([]);
  const [_userRiskProfile, setUserRiskProfile] = useState({
    savingsGoal: parseInt(formData.savingsGoal) || 5000,
    riskTolerance: formData.riskTolerance || "balanced",
    savingsFrequency: formData.savingsFrequency || "monthly",
  });

  // Update user risk profile based on form data
  useEffect(() => {
    if (formData.riskTolerance) {
      setUserRiskProfile({
        savingsGoal: parseInt(formData.savingsGoal) || 5000,
        riskTolerance: formData.riskTolerance as "conservative" | "balanced" | "aggressive",
        savingsFrequency: formData.savingsFrequency || "monthly"
      });
    }
  }, [formData.riskTolerance, formData.savingsGoal, formData.savingsFrequency]);

  // Generate personalized strategies
  useEffect(() => {
    if (formData.savingsGoal && formData.riskTolerance) {
      const strategies = generateRecommendedStrategies(
        parseFloat(formData.savingsGoal),
        formData.riskTolerance,
        formData.savingsFrequency
      );
      setStrategies(strategies);
      
      // Auto-select the first strategy that matches the user's risk profile
      const matchingStrategy = strategies.find(s => s.riskLevel === formData.riskTolerance);
      if (matchingStrategy) {
        setSelectedStrategyId(matchingStrategy.id);
      } else if (strategies.length > 0) {
        setSelectedStrategyId(strategies[0].id);
      }
    }
  }, [formData.savingsGoal, formData.riskTolerance, formData.savingsFrequency]);

  // Handle strategy selection
  const handleStrategySelection = (strategy: Strategy) => {
    setSelectedStrategyId(strategy.id);
    if (onStrategySelect) {
      onStrategySelect(strategy);
    }
  };

  // Only render if we're on the appropriate step (assumed to be step 2 or 3)
  if (currentStep !== 2 && currentStep !== 3) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3 }}
    >
      <h2 className="text-3xl font-bold mb-4 text-center">
        Recommended Investment Strategies
      </h2>
      <p className="text-gray-400 mb-8 text-center max-w-2xl mx-auto">
        Based on your savings goal of ${formData.savingsGoal} and {formData.riskTolerance} risk profile,
        we've customized these strategies to help you maximize your returns.
      </p>

      {/* Strategy Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        {strategies.map((strategy) => (
          <StrategySelectionCard
            key={strategy.id}
            strategy={strategy}
            isSelected={selectedStrategyId === strategy.id}
            onSelect={() => handleStrategySelection(strategy)}
          />
        ))}
      </div>

      {/* Projected Outcomes Visualization */}
      {selectedStrategyId && (
        <ProjectedOutcomesChart
          selectedStrategy={strategies.find(s => s.id === selectedStrategyId) || null}
          timeframe={strategies.find(s => s.id === selectedStrategyId)?.timeframe || 0}
          initialInvestment={parseFloat(formData.savingsAmount) * 4} // Assuming 4 initial deposits
          monthlyContribution={
            formData.savingsFrequency === "daily"
              ? parseFloat(formData.savingsAmount) * 30
              : formData.savingsFrequency === "weekly"
              ? parseFloat(formData.savingsAmount) * 4
              : parseFloat(formData.savingsAmount)
          }
        />
      )}

      <div className="mt-8 p-4 bg-blue-900/20 border border-blue-800 rounded-lg">
        <div className="flex items-start">
          <div className="bg-blue-500/20 p-2 rounded-full mr-3 mt-1">
            <svg
              className="w-5 h-5 text-blue-500"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          </div>
          <div>
            <h4 className="font-medium text-blue-400 mb-1">Strategy Benefits</h4>
            <p className="text-sm text-gray-300">
              The {strategies.find(s => s.id === selectedStrategyId)?.name} strategy is optimized for {strategies.find(s => s.id === selectedStrategyId)?.riskLevel} investors
              looking for {strategies.find(s => s.id === selectedStrategyId)?.riskLevel === "conservative" ? "stable" : 
                         strategies.find(s => s.id === selectedStrategyId)?.riskLevel === "balanced" ? "balanced" : "aggressive"} returns.
              With your {formData.savingsFrequency} contribution of ${formData.savingsAmount},
              you could reach your savings goal in approximately{" "}
              {Math.ceil(
                parseFloat(formData.savingsGoal) / 
                (parseFloat(formData.savingsAmount) * 
                  (formData.savingsFrequency === "daily" ? 30 : 
                   formData.savingsFrequency === "weekly" ? 4 : 1) * 
                  (1 + (strategies.find(s => s.id === selectedStrategyId)?.expectedReturn || 0) / 100))
              )}{" "}
              months.
            </p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

export default AdvancedOnboarding; 