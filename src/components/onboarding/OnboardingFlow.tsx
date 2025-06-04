"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { cn, color, pressable, text } from "@coinbase/onchainkit/theme";
import { useAccount, useConnect, useConnectors, useSignTypedData, useBalance } from "wagmi";
import { Address, Hex, parseUnits } from "viem";
import { CONTRACT_ADDRESSES } from "@/lib/contracts";
import AdvancedOnboarding from "./AdvancedOnboarding";
import SavingsStrategySetup from "@/components/savings/setup/SavingsStrategySetup";

// Define valid savings frequency types to match the expected type in AdvancedOnboarding
type SavingsFrequency = "daily" | "weekly" | "monthly";
// Define valid risk tolerance types
type RiskTolerance = "conservative" | "balanced" | "aggressive";

// Step indicators component
const StepIndicators = ({ currentStep, totalSteps }: { currentStep: number; totalSteps: number }) => {
  return (
    <div className="flex justify-center mb-8">
      {Array.from({ length: totalSteps }).map((_, index) => (
        <div 
          key={index} 
          className={`w-3 h-3 rounded-full mx-1 ${
            index < currentStep 
              ? "bg-gradient-to-r from-blue-500 to-purple-500" 
              : index === currentStep 
                ? "bg-white" 
                : "bg-gray-700"
          } transition-all duration-300`}
        />
      ))}
    </div>
  );
};

export default function OnboardingFlow() {
  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    savingsGoal: "1000",
    savingsFrequency: "weekly" as SavingsFrequency,
    savingsAmount: "50",
    targetToken: CONTRACT_ADDRESSES.ETH,
    riskTolerance: "balanced" as RiskTolerance, // Default to balanced risk
    selectedSubscription: "pro",
    selectedStrategy: ""
  });
  
  const [mounted, setMounted] = useState(false);
  const { address, isConnected } = useAccount();
  const { connectAsync } = useConnect();
  const connectors = useConnectors();
  const { signTypedDataAsync } = useSignTypedData();
  const { data: _balanceData } = useBalance({
    address,
  });
  
  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);

  const handleConnect = async () => {
    if (!isConnected && connectors[0]) {
      try {
        setLoading(true);
        await connectAsync({
          connector: connectors[0],
        });
        setLoading(false);
        // Move to next step after connection
        setCurrentStep(c => c + 1);
      } catch (err) {
        console.error("Connection error:", err);
        setLoading(false);
      }
    } else if (isConnected) {
      // Already connected, move to next step
      setCurrentStep(c => c + 1);
    }
  };
  
  const handleSubscribe = async () => {
    setLoading(true);
    
    try {
      // Determine subscription amount based on selected tier
      let subscriptionAmount = "10"; // Default to Pro
      if (formData.selectedSubscription === "basic") {
        subscriptionAmount = "5";
      } else if (formData.selectedSubscription === "premium") {
        subscriptionAmount = "25";
      }
      
      // Create a spend permission
      const spendPermission = {
        account: address as Address,
        spender: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        token: CONTRACT_ADDRESSES.ETH,
        allowance: parseUnits(subscriptionAmount, 18),
        period: 2592000, // 30 days in seconds
        start: Math.floor(Date.now() / 1000),
        end: Math.floor(Date.now() / 1000) + 31536000, // 1 year from now
        salt: BigInt(Math.floor(Math.random() * 1000000)),
        extraData: "0x" as Hex,
      };
      
      // Sign the permission
      const signature = await signTypedDataAsync({
        domain: {
          name: "Spend Permission Manager",
          version: "1",
          chainId: 84532, // Base Sepolia
          verifyingContract: CONTRACT_ADDRESSES.SPEND_PERMISSION_MANAGER,
        },
        types: {
          SpendPermission: [
            { name: "account", type: "address" },
            { name: "spender", type: "address" },
            { name: "token", type: "address" },
            { name: "allowance", type: "uint160" },
            { name: "period", type: "uint48" },
            { name: "start", type: "uint48" },
            { name: "end", type: "uint48" },
            { name: "salt", type: "uint256" },
            { name: "extraData", type: "bytes" },
          ],
        },
        primaryType: "SpendPermission",
        message: spendPermission,
      });
      
      // Save the permission details to API
      await fetch("/api/subscribe", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          spendPermission,
          signature,
          userData: {
            savingsGoal: formData.savingsGoal,
            savingsFrequency: formData.savingsFrequency,
            savingsAmount: formData.savingsAmount,
            targetToken: formData.targetToken,
            riskTolerance: formData.riskTolerance,
          }
        }),
      });
      
      // Move to the final step
      setCurrentStep(totalSteps - 1);
    } catch (err) {
      console.error("Subscription error:", err);
    }
    
    setLoading(false);
  };
  
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    
    if (name === "savingsFrequency") {
      // Ensure savingsFrequency is properly typed when updated
      setFormData(prev => ({ 
        ...prev, 
        [name]: value as SavingsFrequency 
      }));
    } else if (name === "riskTolerance") {
      // Ensure riskTolerance is properly typed when updated
      setFormData(prev => ({
        ...prev,
        [name]: value as RiskTolerance
      }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };
  
  const nextStep = () => {
    if (currentStep < totalSteps - 1) {
      setCurrentStep(currentStep + 1);
    }
  };
  
  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };
  
  const totalSteps = 6;
  
  if (!mounted) return null;
  
  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-black/50 rounded-2xl border border-gray-800 p-8 backdrop-blur-sm">
        <StepIndicators currentStep={currentStep} totalSteps={totalSteps} />
        
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {currentStep === 0 && (
              <div className="text-center">
                <h2 className="text-3xl font-bold mb-4">Connect Your Wallet</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Let&apos;s get started by connecting your wallet. This will allow you to interact with our protocol.
                </p>
                <div className="max-w-xs mx-auto">
                  <button
                    className={cn(
                      pressable.primary,
                      "w-full py-4 rounded-xl",
                      "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                      loading && pressable.disabled
                    )}
                    onClick={handleConnect}
                    disabled={loading}
                  >
                    <span className={cn(text.headline, color.inverse, "flex items-center justify-center")}>
                      {loading ? (
                        <>
                          <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Connecting...
                        </>
                      ) : (
                        isConnected ? "Continue" : "Connect Wallet"
                      )}
                    </span>
                  </button>
                  
                  {isConnected && (
                    <div className="mt-4 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                      <div className="flex items-center justify-center space-x-2">
                        <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                        <p className="text-sm text-green-500">Connected: {address?.slice(0, 6)}...{address?.slice(-4)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            {currentStep === 1 && (
              <div>
                <h2 className="text-3xl font-bold mb-4 text-center">Set Your Savings Goal</h2>
                <p className="text-gray-400 mb-8 text-center">
                  Let&apos;s establish your savings goals so we can help you reach them.
                </p>
                
                <div className="space-y-6 max-w-lg mx-auto">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      How much would you like to save? ($)
                    </label>
                    <input
                      type="number"
                      name="savingsGoal"
                      value={formData.savingsGoal}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="1000"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      How often would you like to save?
                    </label>
                    <select
                      name="savingsFrequency"
                      value={formData.savingsFrequency}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">
                      How much would you like to save each time? ($)
                    </label>
                    <input
                      type="number"
                      name="savingsAmount"
                      value={formData.savingsAmount}
                      onChange={handleInputChange}
                      className="w-full bg-black/50 border border-gray-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                      placeholder="50"
                    />
                  </div>
                </div>
              </div>
            )}
            
            {currentStep === 2 && (
              <div>
                <h2 className="text-3xl font-bold mb-4 text-center">Configure Your Savings Strategy</h2>
                <p className="text-gray-400 mb-8 text-center">
                  Define how you want to automatically save when making swaps.
                </p>
                
                <SavingsStrategySetup onComplete={nextStep} />
              </div>
            )}
            
            {currentStep === 3 && (
              <AdvancedOnboarding
                formData={formData}
                onStrategySelect={(strategy) => {
                  // Store selected strategy in form data
                  setFormData(prev => ({
                    ...prev,
                    selectedStrategy: strategy.id,
                    riskTolerance: strategy.riskLevel as RiskTolerance
                  }));
                }}
                currentStep={currentStep}
              />
            )}
            
            {currentStep === 4 && (
              <div>
                <h2 className="text-3xl font-bold mb-4 text-center">Choose Your Subscription</h2>
                <p className="text-gray-400 mb-8 text-center">
                  Select a subscription plan that fits your needs.
                </p>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                  {[
                    {
                      id: "basic",
                      name: "Basic",
                      price: "5",
                      features: ["Automated Savings", "Basic DCA", "Email Support"],
                      color: "from-blue-500 to-blue-600"
                    },
                    {
                      id: "pro",
                      name: "Pro",
                      price: "10",
                      features: ["All Basic Features", "Advanced Analytics", "Priority Support", "Yield Optimization"],
                      color: "from-green-500 to-blue-500",
                      popular: true
                    },
                    {
                      id: "premium",
                      name: "Premium",
                      price: "25",
                      features: ["All Pro Features", "Custom Strategies", "Dedicated Manager", "Priority Execution"],
                      color: "from-orange-500 to-red-500"
                    }
                  ].map(tier => (
                    <div
                      key={tier.id}
                      className={`rounded-2xl border p-6 relative
                        ${formData.selectedSubscription === tier.id
                          ? "border-blue-500 shadow-lg shadow-blue-500/20"
                          : "border-gray-800 hover:border-gray-700"
                        } transition-all cursor-pointer`}
                      onClick={() => setFormData(prev => ({ ...prev, selectedSubscription: tier.id }))}
                    >
                      {tier.popular && (
                        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 bg-blue-600 text-white px-4 py-1 rounded-full text-sm font-medium">
                          Popular
                        </div>
                      )}
                      <div className={`h-2 w-20 rounded-full bg-gradient-to-r ${tier.color} mb-4`}></div>
                      <h3 className="text-xl font-bold mb-2">{tier.name}</h3>
                      <div className="mb-4">
                        <span className="text-3xl font-bold">{tier.price}</span>
                        <span className="text-gray-400"> ETH/month</span>
                      </div>
                      <ul className="space-y-2 mb-4">
                        {tier.features.map((feature, idx) => (
                          <li key={idx} className="flex items-start">
                            <svg className="w-5 h-5 mr-2 text-green-500 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                            </svg>
                            <span className="text-sm text-gray-300">{feature}</span>
                          </li>
                        ))}
                      </ul>
                      {formData.selectedSubscription === tier.id && (
                        <div className="absolute -inset-px border-2 border-blue-500 rounded-2xl pointer-events-none"></div>
                      )}
                    </div>
                  ))}
                </div>
                
                <div className="bg-gray-900/50 rounded-lg p-4 max-w-lg mx-auto">
                  <p className="text-sm text-gray-400">
                    Your subscription will automate your savings goals and provide access to advanced features. 
                    You can cancel or change your subscription at any time.
                  </p>
                </div>
              </div>
            )}
            
            {currentStep === 5 && (
              <div className="text-center">
                <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <h2 className="text-3xl font-bold mb-4">All Set!</h2>
                <p className="text-gray-400 mb-8 max-w-md mx-auto">
                  Your SpendSave account is now configured! Your first savings cycle will begin soon.
                </p>
                
                <div className="max-w-md mx-auto bg-black/30 rounded-lg p-6 border border-gray-800 mb-8">
                  <h3 className="font-bold text-xl mb-4">Your Plan Summary</h3>
                  <div className="space-y-3 text-left">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Savings Goal:</span>
                      <span className="font-semibold">${formData.savingsGoal}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Frequency:</span>
                      <span className="font-semibold capitalize">{formData.savingsFrequency}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Amount per Cycle:</span>
                      <span className="font-semibold">${formData.savingsAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Target Token:</span>
                      <span className="font-semibold">
                        {formData.targetToken === CONTRACT_ADDRESSES.ETH ? "ETH" : 
                         formData.targetToken === CONTRACT_ADDRESSES.USDC ? "USDC" : "WETH"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Risk Level:</span>
                      <span className="font-semibold capitalize">{formData.riskTolerance}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Subscription:</span>
                      <span className="font-semibold capitalize">{formData.selectedSubscription}</span>
                    </div>
                  </div>
                </div>
                
                <button
                  className={cn(
                    pressable.primary,
                    "px-8 py-4 rounded-xl",
                    "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                  )}
                  onClick={() => window.location.href = "/app-dashboard"}
                >
                  <span className={cn(text.headline, color.inverse)}>
                    Go to Dashboard
                  </span>
                </button>
              </div>
            )}
          </motion.div>
        </AnimatePresence>
        
        {currentStep > 0 && currentStep < totalSteps - 1 && (
          <div className="flex justify-between mt-8 pt-6 border-t border-gray-800">
            <button
              className="px-6 py-3 rounded-lg border border-gray-700 hover:border-gray-500 transition-all flex items-center"
              onClick={prevStep}
            >
              <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M19 12H5M5 12L11 18M5 12L11 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Back
            </button>
            
            {currentStep === 4 ? (
              <button
                className={cn(
                  pressable.primary,
                  "px-8 py-3 rounded-xl",
                  "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500",
                  loading && pressable.disabled
                )}
                onClick={handleSubscribe}
                disabled={loading}
              >
                <span className={cn(text.headline, color.inverse, "flex items-center")}>
                  {loading ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Processing...
                    </>
                  ) : (
                    <>
                      Confirm Subscription
                      <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    </>
                  )}
                </span>
              </button>
            ) : (
              currentStep !== 2 && (
                <button
                  className={cn(
                    pressable.primary,
                    "px-8 py-3 rounded-xl",
                    "bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                  )}
                  onClick={nextStep}
                >
                  <span className={cn(text.headline, color.inverse, "flex items-center")}>
                    Continue
                    <svg className="w-5 h-5 ml-2" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M5 12H19M19 12L13 6M19 12L13 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </span>
                </button>
              )
            )}
          </div>
        )}
      </div>
    </div>
  );
} 