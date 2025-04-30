"use client";

import { useEffect, useState, useCallback } from 'react';
import DashboardLayout from '@/components/DashboardLayout';
import { useAccount, useBalance, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { motion } from 'framer-motion';
import { FiSettings, FiArrowDown, FiRefreshCw, FiInfo, FiPieChart, FiTrendingUp } from 'react-icons/fi';
import useSpendSaveStrategy from '@/lib/hooks/useSpendSaveStrategy';
import SpendSaveStrategyModal from '@/components/SpendSaveStrategyModal';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { parseUnits, formatUnits, Address } from 'viem';
import { useNotification } from '@/components/NotificationManager';
import SwapConfirmationModal from '@/components/SwapConfirmationModal';
import useGasEstimation from '@/lib/hooks/useGasEstimation';
import useSpendSaveEvents from '@/lib/hooks/useSpendSaveEvents';
import SavingsVisualizerV2 from '@/components/SavingsVisualizerV2';
import SavingsRatioIndicator from '@/components/SavingsRatioIndicator';
import SavingsSummary from '@/components/SavingsSummary';
import useSavingsData from '@/lib/hooks/useSavingsData';

export default function SwapDashboard() {
  const [mounted, setMounted] = useState(false);
  const [fromToken, setFromToken] = useState("ETH");
  const [toToken, setToToken] = useState("USDC");
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  const [swapRate, setSwapRate] = useState("1 ETH = 1,850 USDC");
  const [slippage, setSlippage] = useState("0.5");
  const [showSettings, setShowSettings] = useState(false);
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  const [disableSavingsForThisSwap, setDisableSavingsForThisSwap] = useState(false);
  const [overridePercentage, setOverridePercentage] = useState<number | null>(null);
  const { address, isConnected } = useAccount();
  const { strategy, isLoading: isStrategyLoading } = useSpendSaveStrategy();
  const [showSavingsSummary, setShowSavingsSummary] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showSavingsVisualizer, setShowSavingsVisualizer] = useState(false);
  
  // Get token address from symbol
  const getTokenAddress = useCallback((symbol: string): Address => {
    if (symbol === "ETH") return CONTRACT_ADDRESSES.ETH;
    if (symbol === "USDC") return CONTRACT_ADDRESSES.USDC;
    if (symbol === "WETH") return CONTRACT_ADDRESSES.WETH;
    return CONTRACT_ADDRESSES.ETH; // Default to ETH
  }, []);
  
  // Get real-time savings data from contract
  const { 
    totalSaved,
    goalProgress,
    savingsGoal,
    isLoading: isLoadingSavings 
  } = useSavingsData(getTokenAddress(fromToken));
  
  // Get the total saved amount for the current token
  const getCurrentTokenSaved = useCallback(() => {
    const tokenAddress = getTokenAddress(fromToken);
    return totalSaved[tokenAddress] || "0";
  }, [totalSaved, fromToken, getTokenAddress]);
  
  // Refetch savings data when needed
  const { refetch: refetchSavings } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
    abi: [
      {
        name: 'getUserTotalSaved',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'user', type: 'address' },
          { name: 'token', type: 'address' }
        ],
        outputs: [{ name: 'amount', type: 'uint256' }]
      }
    ],
    functionName: 'getUserTotalSaved',
    args: address ? [address, getTokenAddress(fromToken)] : undefined,
  });

  // Define tokens outside state to avoid unnecessary rerenders
  const tokens = [
    { symbol: "ETH", name: "Ethereum", balance: "0.45", price: 1850 },
    { symbol: "USDC", name: "USD Coin", balance: "1,240.50", price: 1 },
    { symbol: "WBTC", name: "Wrapped Bitcoin", balance: "0.015", price: 29500 },
    { symbol: "DAI", name: "Dai", balance: "500.75", price: 1 },
    { symbol: "LINK", name: "Chainlink", balance: "25.35", price: 16.5 },
    { symbol: "UNI", name: "Uniswap", balance: "75.5", price: 7.2 },
  ];

  // Calculate the savings amount based on the strategy
  const calculateSavingsAmount = useCallback(() => {
    if (!fromAmount || isNaN(parseFloat(fromAmount))) return "0";
    
    if (disableSavingsForThisSwap) return "0";
    
    const percentage = overridePercentage !== null 
      ? overridePercentage 
      : (strategy.currentPercentage / 100); // Convert basis points to percentage
    
    const amount = parseFloat(fromAmount) * (percentage / 100);
    return amount.toFixed(6);
  }, [fromAmount, strategy.currentPercentage, disableSavingsForThisSwap, overridePercentage]);

  // Calculate the actual swap amount (after savings deduction)
  const getActualSwapAmount = useCallback(() => {
    if (!fromAmount || isNaN(parseFloat(fromAmount))) return "0";
    
    if (disableSavingsForThisSwap) return fromAmount;
    
    const savingsAmount = parseFloat(calculateSavingsAmount());
    const actualAmount = parseFloat(fromAmount) - savingsAmount;
    return actualAmount.toFixed(6);
  }, [fromAmount, calculateSavingsAmount, disableSavingsForThisSwap]);

  // Estimate annual savings based on current strategy and swap amount
  const estimateAnnualSavings = useCallback(() => {
    if (!fromAmount || isNaN(parseFloat(fromAmount)) || !strategy.isConfigured) return "0";
    
    // Estimate based on making similar swaps twice a week
    const weeklySwaps = 2;
    const savingsPerSwap = parseFloat(calculateSavingsAmount());
    const annualSavings = savingsPerSwap * weeklySwaps * 52;
    
    return annualSavings.toFixed(4);
  }, [fromAmount, calculateSavingsAmount, strategy.isConfigured]);

  // Mock function to get total amount saved so far (in a real app, this would come from contract data)
  const getTotalSavedSoFar = useCallback(() => {
    // This would be replaced with actual data from contracts in production
    return getCurrentTokenSaved();
  }, [getCurrentTokenSaved]);

  // Calculate rate as a memoized function to avoid recalculations
  const calculateRate = useCallback((fromSymbol: string, toSymbol: string): number | null => {
    try {
      const fromTokenObj = tokens.find(t => t.symbol === fromSymbol);
      const toTokenObj = tokens.find(t => t.symbol === toSymbol);
      
      if (!fromTokenObj || !toTokenObj) return null;
      
      return fromTokenObj.price / toTokenObj.price;
    } catch (error) {
      console.error("Error calculating rate:", error);
      return null;
    }
  }, [tokens]);

  // Update swap rates in a controlled way
  useEffect(() => {
    try {
      // Only calculate if we have valid input
      if (!fromAmount || isNaN(parseFloat(fromAmount))) {
        setToAmount("");
        return;
      }
      
      const rate = calculateRate(fromToken, toToken);
      if (rate === null) {
        setToAmount("");
        return;
      }
      
      // Use the actual swap amount (after savings deduction)
      const actualAmount = getActualSwapAmount();
      
      // Set the calculated amount
      const calculatedAmount = (parseFloat(actualAmount) * rate).toFixed(6);
      setToAmount(calculatedAmount);
      
      // Update rate display with proper formatting
      setSwapRate(`1 ${fromToken} = ${rate.toFixed(rate < 0.01 ? 6 : 2)} ${toToken}`);
    } catch (error) {
      console.error("Error in swap calculation:", error);
      // Reset to prevent invalid state
      setToAmount("");
    }
  }, [fromAmount, fromToken, toToken, calculateRate, getActualSwapAmount]);

  // Handle token swap with error handling
  const swapTokens = useCallback(() => {
    try {
      // Store current values
      const temp = fromToken;
      const tempAmount = toAmount;
      
      // Update state in order
      setFromToken(toToken);
      setToToken(temp);
      setFromAmount(tempAmount);
      // toAmount will be updated by the useEffect
    } catch (error) {
      console.error("Error during token swap:", error);
    }
  }, [fromToken, toToken, toAmount]);

  // Check if user has a strategy and prompt if it's their first use
  useEffect(() => {
    if (mounted && isConnected && !isStrategyLoading && !strategy.isConfigured) {
      // Show the strategy setup modal after a short delay
      const timer = setTimeout(() => {
        setShowStrategyModal(true);
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [mounted, isConnected, isStrategyLoading, strategy.isConfigured]);

  const getSavingsTokenType = () => {
    switch (strategy.savingsTokenType) {
      case 0: return 'input token';
      case 1: return 'output token';
      case 2: return tokens.find(t => t.symbol === getSymbolFromAddress(strategy.specificSavingsToken))?.symbol || 'specific token';
      default: return 'input token';
    }
  };

  const getSymbolFromAddress = (address: string) => {
    if (address === CONTRACT_ADDRESSES.ETH) return 'ETH';
    if (address === CONTRACT_ADDRESSES.USDC) return 'USDC';
    if (address === CONTRACT_ADDRESSES.WETH) return 'WETH';
    return 'Unknown';
  };

  // Submit swap
  const { writeContract, isPending: isSubmitting } = useWriteContract();

  const handleSwap = () => {
    if (!isConnected || !fromAmount || parseFloat(fromAmount) <= 0) return;
    
    // Show confirmation modal first
    setShowConfirmModal(true);
  };

  // Inside component body, get the notification context
  const { addNotification } = useNotification();
  
  // In confirmSwap function, replace toast with addNotification
  const confirmSwap = () => {
    setShowConfirmModal(false);
    
    // For this example, we're just showing a success notification
    // In a real implementation, this would call the contract methods
    addNotification({
      type: 'success',
      title: 'Swap Successful',
      message: `Swapped ${getActualSwapAmount()} ${fromToken} for ${toAmount} ${toToken}`,
      autoClose: true,
      linkUrl: '/app-dashboard/savings',
      linkText: 'View your savings'
    });
    
    // Update UI to show summary and savings visualizer
    setShowSavingsSummary(true);
    setShowSavingsVisualizer(true);
    setTimeout(() => setShowSavingsSummary(false), 5000);
  };

  // Handle hydration
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Inside component body, use the gas estimation hook
  const { gasInEth } = useGasEstimation(
    'swap',
    strategy,
    overridePercentage,
    disableSavingsForThisSwap
  );
  
  // Import events hook
  const { inputTokenSavedEvents, outputSavingsEvents, dcaQueuedEvents } = useSpendSaveEvents();
  
  // Add event notification display
  useEffect(() => {
    // Listen for new input token saved events
    if (inputTokenSavedEvents.length > 0) {
      const latestEvent = inputTokenSavedEvents[inputTokenSavedEvents.length - 1];
      
      // Find token symbol
      const tokenSymbol = tokens.find(t => 
        t.symbol.toLowerCase() === getSymbolFromAddress(latestEvent.token).toLowerCase()
      )?.symbol || 'Token';
      
      const formattedAmount = formatUnits(latestEvent.savedAmount, 18);
      
      addNotification({
        type: 'success',
        title: 'Tokens Saved',
        message: `${formattedAmount} ${tokenSymbol} has been saved`,
        autoClose: true,
        linkUrl: '/app-dashboard/savings',
        linkText: 'View your savings'
      });
    }
  }, [inputTokenSavedEvents, addNotification, tokens]);
  
  // Listen for output savings events
  useEffect(() => {
    if (outputSavingsEvents.length > 0) {
      const latestEvent = outputSavingsEvents[outputSavingsEvents.length - 1];
      
      // Find token symbol
      const tokenSymbol = tokens.find(t => 
        t.symbol.toLowerCase() === getSymbolFromAddress(latestEvent.token).toLowerCase()
      )?.symbol || 'Token';
      
      const formattedAmount = formatUnits(latestEvent.amount, 18);
      
      addNotification({
        type: 'success',
        title: 'Output Tokens Saved',
        message: `${formattedAmount} ${tokenSymbol} has been saved from your swap output`,
        autoClose: true,
        linkUrl: '/app-dashboard/savings',
        linkText: 'View your savings'
      });
    }
  }, [outputSavingsEvents, addNotification, tokens]);
  
  // Listen for DCA queue events
  useEffect(() => {
    if (dcaQueuedEvents.length > 0) {
      const latestEvent = dcaQueuedEvents[dcaQueuedEvents.length - 1];
      
      // Find token symbols
      const fromTokenSymbol = tokens.find(t => 
        t.symbol.toLowerCase() === getSymbolFromAddress(latestEvent.fromToken).toLowerCase()
      )?.symbol || 'Token';
      
      const toTokenSymbol = tokens.find(t => 
        t.symbol.toLowerCase() === getSymbolFromAddress(latestEvent.toToken).toLowerCase()
      )?.symbol || 'Token';
      
      const formattedAmount = formatUnits(latestEvent.amount, 18);
      
      addNotification({
        type: 'success',
        title: 'DCA Queue Updated',
        message: `${formattedAmount} ${fromTokenSymbol} added to DCA queue for ${toTokenSymbol}`,
        autoClose: true,
        linkUrl: '/app-dashboard/dca',
        linkText: 'View DCA Queue'
      });
    }
  }, [dcaQueuedEvents, addNotification, tokens]);
  
  if (!mounted) return <div className="loading-container">Loading...</div>;
  
  return (
    <DashboardLayout>
      <main className="flex items-center justify-center p-6 overflow-auto h-full">
        <motion.div 
          className="w-full max-w-md"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <div className="bg-gray-900/60 backdrop-blur-md border border-gray-800 rounded-xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Swap</h2>
              <div className="flex space-x-2">
                {strategy.isConfigured && (
                  <button 
                    onClick={() => setShowStrategyModal(true)}
                    className="text-gray-400 hover:text-white p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition"
                    title="Edit savings strategy"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </button>
                )}
                <button 
                  onClick={() => setShowSettings(!showSettings)}
                  className="text-gray-400 hover:text-white p-2 rounded-lg bg-gray-800/50 hover:bg-gray-800 transition"
                >
                  <FiSettings size={18} />
                </button>
              </div>
            </div>
            
            {/* Savings Strategy Info Panel */}
            {strategy.isConfigured && (
              <div className="mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="text-sm font-medium text-blue-400">SpendSave Active</h3>
                    <p className="text-xs text-gray-300 mt-0.5">Saving {strategy.currentPercentage / 100}% of {getSavingsTokenType()}</p>
                  </div>
                  <button
                    onClick={() => setShowStrategyModal(true)}
                    className="text-xs text-blue-400 hover:text-blue-300"
                  >
                    Edit
                  </button>
                </div>
                {fromAmount && parseFloat(fromAmount) > 0 && !disableSavingsForThisSwap && (
                  <div className="mt-2 text-xs">
                    <p className="text-gray-400">Will save: <span className="text-white">{calculateSavingsAmount()} {fromToken}</span></p>
                    <p className="text-gray-400">Actual swap: <span className="text-white">{getActualSwapAmount()} {fromToken}</span></p>
                  </div>
                )}
              </div>
            )}
            
            {showSettings && (
              <div className="mb-4 p-4 bg-gray-800/60 rounded-lg">
                <h3 className="text-sm font-medium mb-3">Transaction Settings</h3>
                <div className="flex items-center justify-between mb-3">
                  <label htmlFor="slippage" className="text-sm text-gray-400">Slippage Tolerance</label>
                  <div className="flex items-center space-x-2">
                    <input
                      id="slippage"
                      type="text"
                      value={slippage}
                      onChange={(e) => setSlippage(e.target.value)}
                      className="bg-gray-700 text-white rounded-lg p-1 w-16 text-right"
                    />
                    <span className="text-sm text-gray-400">%</span>
                  </div>
                </div>
                
                {strategy.isConfigured && (
                  <>
                    <div className="border-t border-gray-700 my-3 pt-3">
                      <h3 className="text-sm font-medium mb-3">Savings Settings</h3>
                      
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center">
                          <input
                            id="disableSavings"
                            type="checkbox"
                            checked={disableSavingsForThisSwap}
                            onChange={(e) => setDisableSavingsForThisSwap(e.target.checked)}
                            className="mr-2"
                          />
                          <label htmlFor="disableSavings" className="text-sm text-gray-400">Disable savings for this swap</label>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between">
                        <label htmlFor="overridePercentage" className="text-sm text-gray-400">Override savings percentage</label>
                        <div className="flex items-center space-x-2">
                          <input
                            id="overridePercentage"
                            type="number"
                            min="0"
                            max="50"
                            placeholder={`${strategy.currentPercentage / 100}`}
                            value={overridePercentage === null ? '' : overridePercentage}
                            onChange={(e) => {
                              const value = e.target.value === '' ? null : parseFloat(e.target.value);
                              setOverridePercentage(value);
                            }}
                            disabled={disableSavingsForThisSwap}
                            className={`bg-gray-700 text-white rounded-lg p-1 w-16 text-right ${disableSavingsForThisSwap ? 'opacity-50 cursor-not-allowed' : ''}`}
                          />
                          <span className="text-sm text-gray-400">%</span>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
            
            {/* From Token */}
            <div className="mb-2 bg-gray-800/40 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">From</label>
                <span className="text-xs text-gray-400">
                  Balance: {tokens.find(t => t.symbol === fromToken)?.balance || "0"} {fromToken}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={fromAmount}
                  onChange={(e) => setFromAmount(e.target.value)}
                  placeholder="0.0"
                  className="bg-transparent text-xl font-semibold focus:outline-none w-3/5"
                />
                <select
                  value={fromToken}
                  onChange={(e) => setFromToken(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg font-medium"
                >
                  {tokens.map(token => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Swap Button */}
            <div className="relative h-10 flex justify-center my-2">
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-full border-t border-gray-800"></div>
              </div>
              <button
                onClick={swapTokens}
                className="absolute bg-gray-800 rounded-full p-2 hover:bg-gray-700 z-10 transition-colors"
              >
                <FiArrowDown size={18} />
              </button>
            </div>
            
            {/* To Token */}
            <div className="mb-4 bg-gray-800/40 rounded-xl p-4">
              <div className="flex justify-between mb-2">
                <label className="text-sm text-gray-400">To</label>
                <span className="text-xs text-gray-400">
                  Balance: {tokens.find(t => t.symbol === toToken)?.balance || "0"} {toToken}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <input
                  type="text"
                  value={toAmount}
                  readOnly
                  placeholder="0.0"
                  className="bg-transparent text-xl font-semibold focus:outline-none w-3/5"
                />
                <select
                  value={toToken}
                  onChange={(e) => setToToken(e.target.value)}
                  className="bg-gray-700 text-white px-3 py-2 rounded-lg font-medium"
                >
                  {tokens.map(token => (
                    <option key={token.symbol} value={token.symbol}>
                      {token.symbol}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            
            {/* Swap Rate */}
            <div className="flex justify-between text-sm mb-6">
              <span className="text-gray-400">Rate</span>
              <div className="flex items-center">
                <span className="text-gray-300 mr-2">{swapRate}</span>
                <button 
                  type="button" 
                  className="text-gray-400 hover:text-white"
                  onClick={() => {
                    // Refresh rate manually
                    const rate = calculateRate(fromToken, toToken);
                    if (rate !== null) {
                      setSwapRate(`1 ${fromToken} = ${rate.toFixed(rate < 0.01 ? 6 : 2)} ${toToken}`);
                    }
                  }}
                >
                  <FiRefreshCw size={14} />
                </button>
              </div>
            </div>
            
            {/* Display swap info when savings is configured */}
            {strategy.isConfigured && fromAmount && parseFloat(fromAmount) > 0 && !disableSavingsForThisSwap && (
              <div className="mb-4 p-3 bg-gray-800/40 rounded-lg text-sm">
                <div className="flex justify-between mb-1">
                  <span className="text-gray-400">Savings:</span>
                  <span className="text-white">{calculateSavingsAmount()} {fromToken}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Actual swap amount:</span>
                  <span className="text-white">{getActualSwapAmount()} {fromToken}</span>
                </div>
                
                {/* Annual Savings Projection */}
                <div className="flex justify-between mt-2 pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Projected annual savings:</span>
                  <div className="flex items-center">
                    <span className="text-green-400">{estimateAnnualSavings()} {fromToken}</span>
                    <FiTrendingUp className="ml-1 text-green-400" />
                  </div>
                </div>
                
                {/* Show Savings Visualization Button */}
                <button
                  onClick={() => setShowSavingsVisualizer(!showSavingsVisualizer)}
                  className="w-full mt-2 text-xs text-blue-400 hover:text-blue-300 flex items-center justify-center"
                >
                  <FiPieChart className="mr-1" />
                  {showSavingsVisualizer ? 'Hide' : 'Show'} savings impact
                </button>
              </div>
            )}
            
            {/* Savings Impact Visualizer */}
            {showSavingsVisualizer && strategy.isConfigured && (
              <SavingsVisualizerV2
                fromAmount={fromAmount}
                fromToken={fromToken}
                tokenPrice={tokens.find(t => t.symbol === fromToken)?.price || 0}
                strategy={strategy}
                overridePercentage={overridePercentage}
                disableSavings={disableSavingsForThisSwap}
              />
            )}
            
            {/* Savings Summary (shown after swap) */}
            {showSavingsSummary && (
              <SavingsSummary
                fromToken={fromToken}
                fromAmount={fromAmount}
                toToken={toToken}
                toAmount={toAmount}
                getActualSwapAmount={getActualSwapAmount}
                calculateSavingsAmount={calculateSavingsAmount}
              />
            )}
            
            {/* Swap Button */}
            <button
              disabled={!fromAmount || !isConnected || isSubmitting}
              onClick={handleSwap}
              className={`w-full py-3 rounded-xl font-bold ${
                fromAmount && isConnected && !isSubmitting
                  ? "bg-blue-600 hover:bg-blue-500 text-white"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              } transition-colors flex items-center justify-center`}
            >
              {!isConnected ? "Connect Wallet" : 
                isSubmitting ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Swapping...
                  </>
                ) : "Swap"
              }
            </button>
          </div>
        </motion.div>
      </main>
      
      {/* Strategy Modal */}
      <SpendSaveStrategyModal 
        isOpen={showStrategyModal} 
        onClose={() => setShowStrategyModal(false)}
        isFirstTime={!strategy.isConfigured}
      />
      
      {/* Swap Confirmation Modal */}
      <SwapConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => setShowConfirmModal(false)}
        onConfirm={confirmSwap}
        fromToken={fromToken}
        toToken={toToken}
        fromAmount={fromAmount}
        toAmount={toAmount}
        strategy={strategy}
        overridePercentage={overridePercentage}
        disableSavings={disableSavingsForThisSwap}
        slippage={slippage}
        gasEstimate={gasInEth + " ETH"}
      />
    </DashboardLayout>
  );
} 