import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAccount, useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, Address } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import toast from 'react-hot-toast';

// Define SavingsTokenType enum to match contract
enum SavingsTokenType {
  INPUT = 0,
  OUTPUT = 1,
  SPECIFIC = 2
}

// Token options
const TOKEN_OPTIONS = [
  { value: CONTRACT_ADDRESSES.ETH, label: "ETH" },
  { value: CONTRACT_ADDRESSES.USDC, label: "USDC" },
  { value: CONTRACT_ADDRESSES.WETH, label: "WETH" },
];

interface SpendSaveStrategyModalProps {
  isOpen: boolean;
  onClose: () => void;
  onComplete?: () => void;
  isFirstTime?: boolean;
  /**
   * Provide a strategy object to control the modal externally (optional).
   */
  strategy?: any;
  /**
   * Callback fired when the user updates the strategy via the form (only called if `strategy` is provided).
   */
  onStrategyChange?: (newStrategy: any) => void;
  /**
   * Fallback strategy to use when uncontrolled and no existing on-chain strategy present.
   */
  initialStrategy?: any;
  /**
   * Callback fired when the existing on-chain strategy has been fetched and normalised.
   */
  onStrategySaved?: (s: any) => void;
}

const SpendSaveStrategyModal: React.FC<SpendSaveStrategyModalProps> = ({ 
  isOpen, 
  onClose, 
  onComplete,
  isFirstTime = false,
  initialStrategy = null,
  strategy: controlledStrategy,
  onStrategyChange,
  onStrategySaved
}) => {
  const { address } = useAccount();
  const [step, setStep] = useState(isFirstTime ? 0 : 1);
  const [loading, setLoading] = useState(false);

  const [strategy, setStrategyState] = useState<any>(() => {
    // Create the initial state with validated values
    const initialState = controlledStrategy ?? initialStrategy ?? {
      percentage: 10,
      autoIncrement: 0,
      maxPercentage: 25,
      roundUpSavings: true,
      savingsTokenType: SavingsTokenType.INPUT,
      specificToken: CONTRACT_ADDRESSES.ETH,
      enableDCA: false,
      dcaTargetToken: CONTRACT_ADDRESSES.ETH,
    };
    
    // Ensure all numeric values are valid
    return {
      ...initialState,
      percentage: Number.isNaN(initialState.percentage) ? 10 : initialState.percentage,
      autoIncrement: Number.isNaN(initialState.autoIncrement) ? 0 : initialState.autoIncrement,
      maxPercentage: Number.isNaN(initialState.maxPercentage) ? 25 : initialState.maxPercentage,
    };
  });

  // Add validation to ensure strategy values are always numbers
  useEffect(() => {
    if (strategy) {
      // Validate and correct any NaN values
      const validatedStrategy = {
        ...strategy,
        percentage: Number.isNaN(strategy.percentage) ? 10 : strategy.percentage,
        autoIncrement: Number.isNaN(strategy.autoIncrement) ? 0 : strategy.autoIncrement,
        maxPercentage: Number.isNaN(strategy.maxPercentage) ? 25 : strategy.maxPercentage,
      };
      
      // Update if there were any corrections
      if (validatedStrategy.percentage !== strategy.percentage ||
          validatedStrategy.autoIncrement !== strategy.autoIncrement ||
          validatedStrategy.maxPercentage !== strategy.maxPercentage) {
        setStrategyState(validatedStrategy);
      }
    }
  }, [strategy]);

  // Get existing strategy if available
  const { data: existingStrategy, isLoading: isLoadingStrategy } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getUserSavingStrategy',
        type: 'function',
        stateMutability: 'view',
        inputs: [{ name: 'user', type: 'address' }],
        outputs: [
          { name: 'currentPercentage', type: 'uint256' },
          { name: 'autoIncrement', type: 'uint256' },
          { name: 'maxPercentage', type: 'uint256' },
          { name: 'goalAmount', type: 'uint256' },
          { name: 'roundUpSavings', type: 'bool' },
          { name: 'enableDCA', type: 'bool' },
          { name: 'savingsTokenType', type: 'uint8' },
          { name: 'specificSavingsToken', type: 'address' }
        ]
      }
    ],
    functionName: 'getUserSavingStrategy',
    args: address ? [address] : undefined,
  });

  // Contract write hook
  const { data: hash, isPending, writeContract } = useWriteContract();

  // Wait for transaction receipt
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ 
    hash,
  });

  // Initialize strategy from existing data if available
  useEffect(() => {
    if (existingStrategy && Array.isArray(existingStrategy)) {
      try {
        // Get values from strategy and ensure they're valid numbers
        const currentPercentage = Number(existingStrategy[0]) / 100; // Convert from basis points
        const autoIncrement = Number(existingStrategy[1]) / 100;
        const maxPercentage = Number(existingStrategy[2]) / 100;
        
        onStrategySaved?.({
          percentage: Number.isNaN(currentPercentage) ? 10 : currentPercentage,
          autoIncrement: Number.isNaN(autoIncrement) ? 0 : autoIncrement, 
          maxPercentage: Number.isNaN(maxPercentage) ? 25 : maxPercentage,
          roundUpSavings: existingStrategy[4],
          savingsTokenType: Number(existingStrategy[6]),
          specificToken: existingStrategy[7] as Address || CONTRACT_ADDRESSES.ETH,
          enableDCA: existingStrategy[5],
          dcaTargetToken: CONTRACT_ADDRESSES.ETH // We'll need to fetch this separately
        });
      } catch (error) {
        console.error("Error processing existing strategy:", error);
        // Fallback to default values on error
        onStrategySaved?.({
          percentage: 10,
          autoIncrement: 0,
          maxPercentage: 25,
          roundUpSavings: true,
          savingsTokenType: 0,
          specificToken: CONTRACT_ADDRESSES.ETH,
          enableDCA: false,
          dcaTargetToken: CONTRACT_ADDRESSES.ETH
        });
      }
    }
  }, [existingStrategy, onStrategySaved]);

  // Allow controlled usage – when `strategy` prop changes update internal state
  useEffect(() => {
    if (controlledStrategy) {
      setStrategyState(controlledStrategy)
    }
  }, [controlledStrategy])

  // Wrapper to update state and propagate to parent if using controlled component pattern
  const setStrategy = (updater: any) => {
    setStrategyState(updater)
    onStrategyChange?.(typeof updater === 'function' ? updater(strategy) : updater)
  };

  // Handle status changes
  useEffect(() => {
    setLoading(isPending || isConfirming);
    if (isSuccess) {
      toast.success('Strategy saved successfully!');
      // Delay completion to show success state
      setTimeout(() => {
        onComplete?.();
        onClose();
      }, 1000);
    }
  }, [isPending, isConfirming, isSuccess, onComplete, onClose]);
  const handleSubmit = async () => {
    if (!address) return;
    
    try {
      // Helper function to ensure we never pass NaN to BigInt
      const safeBigInt = (value: number): bigint => {
        // If value is NaN or not an integer, use a default value
        if (Number.isNaN(value) || !Number.isInteger(value)) {
          console.warn(`Attempted to convert invalid value to BigInt: ${value}. Using default.`);
          return BigInt(0);
        }
        return BigInt(value);
      };

      // Convert percentage values to basis points for contract (e.g., 10% becomes 1000)
      // Add validation to ensure values are numbers and provide fallbacks for NaN
      const percentageBasisPoints = Math.round(
        Number.isNaN(strategy.percentage) ? 10 * 100 : strategy.percentage * 100
      );
      const autoIncrementBasisPoints = Math.round(
        Number.isNaN(strategy.autoIncrement) ? 0 : strategy.autoIncrement * 100
      );
      const maxPercentageBasisPoints = Math.round(
        Number.isNaN(strategy.maxPercentage) ? 
        (Number.isNaN(strategy.percentage) ? 25 : strategy.percentage * 2) * 100 : 
        strategy.maxPercentage * 100
      );

      // Log values for debugging
      console.log("Strategy values being sent to contract:", {
        percentage: percentageBasisPoints,
        autoIncrement: autoIncrementBasisPoints,
        maxPercentage: maxPercentageBasisPoints
      });

      // Call contract to set saving strategy
      writeContract({
        address: CONTRACT_ADDRESSES.SAVING_STRATEGY,
        abi: [
          {
            name: 'setSavingStrategy',
            type: 'function',
            stateMutability: 'nonpayable',
            inputs: [
              { name: 'user', type: 'address' },
              { name: 'percentage', type: 'uint256' },
              { name: 'autoIncrementPercentage', type: 'uint256' },
              { name: 'maxPercentage', type: 'uint256' },
              { name: 'roundUpSavings', type: 'bool' },
              { name: 'savingsTokenType', type: 'uint8' },
              { name: 'specificTokenAddress', type: 'address' }
            ],
            outputs: []
          }
        ],
        functionName: 'setSavingStrategy',
        args: [
          address,
          safeBigInt(percentageBasisPoints),
          safeBigInt(autoIncrementBasisPoints),
          safeBigInt(maxPercentageBasisPoints),
          strategy.roundUpSavings,
          Number(strategy.savingsTokenType),
          strategy.savingsTokenType === SavingsTokenType.SPECIFIC 
            ? strategy.specificToken
            : "0x0000000000000000000000000000000000000000" as Address
        ]
      });
    } catch (error) {
      console.error("Error setting saving strategy:", error);
      toast.error('Failed to save strategy');
      setLoading(false);
    }
  };

  const nextStep = () => {
    if (step < 2) {
      setStep(step + 1);
    } else {
      handleSubmit();
    }
  };

  const prevStep = () => {
    if (step > 0) {
      setStep(step - 1);
    } else {
      onClose();
    }
  };

  // Helper to get token label for display
  const getTokenLabel = (tokenAddress: Address) => {
    const token = TOKEN_OPTIONS.find(t => t.value === tokenAddress);
    return token ? token.label : 'Unknown Token';
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6 w-full max-w-md"
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold">
            {isFirstTime ? 'Welcome to SpendSave!' : 'Configure Savings Strategy'}
          </h2>
          {!isFirstTime && (
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M6 18L18 6M6 6L18 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>

        {/* Step Indicator */}
        {isFirstTime && (
          <div className="flex justify-between mb-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="flex flex-col items-center">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center ${step === i ? 'bg-blue-500' : 'bg-gray-700'}`}>
                  {i + 1}
                </div>
                <span className="text-xs mt-1">
                  {i === 0 ? 'Welcome' : i === 1 ? 'Strategy' : 'DCA'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Content */}
        <div className="space-y-6">
          {/* Welcome Step */}
          {step === 0 && (
            <div>
              <p className="text-gray-300 mb-4">
                SpendSave helps you save while you swap! With every token swap, we can automatically set aside a percentage for your savings.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-4 my-4">
                <h3 className="font-medium text-blue-400 mb-2">How it works:</h3>
                <ul className="text-sm space-y-2">
                  <li className="flex items-start">
                    <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5">1</span>
                    <span>You set a percentage to save from each swap</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5">2</span>
                    <span>We automatically save that portion whenever you swap</span>
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-500/20 text-blue-400 rounded-full w-5 h-5 flex items-center justify-center mr-2 mt-0.5">3</span>
                    <span>Access your savings anytime from your dashboard</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* Strategy Step */}
          {step === 1 && (
            <div>
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Save percentage of each swap
                </label>
                <div className="flex items-center">
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={strategy.percentage}
                    onChange={(e) => {
                      // Convert to number and validate
                      const value = parseInt(e.target.value);
                      setStrategy({...strategy, percentage: isNaN(value) ? 1 : value});
                    }}
                    className="w-full"
                  />
                  <span className="ml-2 text-white font-medium w-12 text-right">{strategy.percentage}%</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">This percentage of each swap will be saved automatically</p>
              </div>
              
              <div className="mt-4">
                <div className="flex items-center">
                  <input
                    type="checkbox"
                    id="autoIncrement"
                    checked={strategy.autoIncrement > 0}
                    onChange={(e) => setStrategy({...strategy, autoIncrement: e.target.checked ? 0.5 : 0})}
                    className="mr-2"
                  />
                  <label htmlFor="autoIncrement" className="text-sm text-gray-300">
                    Automatically increase saving percentage over time
                  </label>
                </div>
                
                {strategy.autoIncrement > 0 && (
                  <div className="pl-6 border-l border-gray-800 mt-3">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Increase by (per swap)
                    </label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="0.1"
                        max="2"
                        step="0.1"
                        value={strategy.autoIncrement}
                        onChange={(e) => {
                          // Convert to float and validate
                          const value = parseFloat(e.target.value);
                          setStrategy({...strategy, autoIncrement: isNaN(value) ? 0.1 : value});
                        }}
                        className="w-full"
                      />
                      <span className="ml-2 text-white font-medium w-12 text-right">{strategy.autoIncrement}%</span>
                    </div>
                    
                    <div className="mt-3">
                      <label className="block text-sm font-medium text-gray-400 mb-2">
                        Maximum percentage
                      </label>
                      <div className="flex items-center">
                        <input
                          type="range"
                          min={strategy.percentage}
                          max="50"
                          value={strategy.maxPercentage}
                          onChange={(e) => {
                            // Convert to number and validate
                            const value = parseInt(e.target.value);
                            setStrategy({...strategy, maxPercentage: isNaN(value) ? 10 : value});
                          }}
                          className="w-full"
                        />
                        <span className="ml-2 text-white font-medium w-12 text-right">{strategy.maxPercentage}%</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Token Type Step */}
          {step === 2 && (
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Which token to save
              </label>
              <div className="grid grid-cols-3 gap-3">
                <div 
                  className={`border ${strategy.savingsTokenType === SavingsTokenType.INPUT ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer text-center`}
                  onClick={() => setStrategy({...strategy, savingsTokenType: SavingsTokenType.INPUT})}
                >
                  <div className="text-sm font-medium">Input Token</div>
                  <div className="text-xs text-gray-400 mt-1">Save part of what you spend</div>
                </div>
                <div 
                  className={`border ${strategy.savingsTokenType === SavingsTokenType.OUTPUT ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer text-center`}
                  onClick={() => setStrategy({...strategy, savingsTokenType: SavingsTokenType.OUTPUT})}
                >
                  <div className="text-sm font-medium">Output Token</div>
                  <div className="text-xs text-gray-400 mt-1">Save part of what you receive</div>
                </div>
                <div 
                  className={`border ${strategy.savingsTokenType === SavingsTokenType.SPECIFIC ? 'border-blue-500 bg-blue-500/10' : 'border-gray-700'} rounded-lg p-3 cursor-pointer text-center`}
                  onClick={() => setStrategy({...strategy, savingsTokenType: SavingsTokenType.SPECIFIC})}
                >
                  <div className="text-sm font-medium">Specific Token</div>
                  <div className="text-xs text-gray-400 mt-1">Always save in one token</div>
                </div>
              </div>
              
              {strategy.savingsTokenType === SavingsTokenType.SPECIFIC && (
                <div className="mt-4">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Specific token to save
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    value={strategy.specificToken}
                    onChange={(e) => setStrategy({...strategy, specificToken: e.target.value as Address})}
                  >
                    {TOKEN_OPTIONS.map((token) => (
                      <option key={token.value} value={token.value}>
                        {token.label}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="roundUp"
                  checked={strategy.roundUpSavings}
                  onChange={(e) => setStrategy({...strategy, roundUpSavings: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="roundUp" className="text-sm text-gray-300">
                  Round up savings to the nearest token unit
                </label>
              </div>

              <div className="flex items-center mt-4">
                <input
                  type="checkbox"
                  id="enableDCA"
                  checked={strategy.enableDCA}
                  onChange={(e) => setStrategy({...strategy, enableDCA: e.target.checked})}
                  className="mr-2"
                />
                <label htmlFor="enableDCA" className="text-sm text-gray-300">
                  Enable DCA (Dollar-Cost Averaging)
                </label>
              </div>
              
              {strategy.enableDCA && (
                <div className="pl-6 border-l border-gray-800 mt-3">
                  <label className="block text-sm font-medium text-gray-400 mb-2">
                    Target token for DCA
                  </label>
                  <select
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white"
                    value={strategy.dcaTargetToken}
                    onChange={(e) => setStrategy({...strategy, dcaTargetToken: e.target.value as Address})}
                  >
                    {TOKEN_OPTIONS.map((token) => (
                      <option key={token.value} value={token.value}>
                        {token.label}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-gray-500 mt-1">Saved tokens will be automatically converted to this token when market conditions are favorable</p>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-between mt-6">
          <button
            onClick={prevStep}
            className="px-4 py-2 border border-gray-700 rounded-lg hover:bg-gray-800 transition-colors"
          >
            {step === 0 ? 'Cancel' : 'Back'}
          </button>
          
          <button
            onClick={nextStep}
            disabled={loading}
            className={`px-6 py-2 rounded-lg ${loading ? 'bg-gray-700 text-gray-400 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-500 text-white'} transition-colors flex items-center`}
          >
            {loading && (
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            )}
            {step === 2 ? (loading ? 'Saving...' : 'Save Strategy') : 'Next'}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default SpendSaveStrategyModal; 