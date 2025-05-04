"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import useSwapWithSavings from '@/lib/hooks/useSwapWithSavings';
import useDCAManagement from '@/lib/hooks/useDCAManagement';
import useSpendSaveStrategy from '@/lib/hooks/useSpendSaveStrategy';
import { useTokenList, Token } from '@/lib/hooks/useTokenList';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import { FiSettings, FiArrowDown, FiInfo, FiExternalLink } from 'react-icons/fi';
import SwapConfirmationModal from './SwapConfirmationModal';
import SpendSaveEventListeners from './SpendSaveEventListeners';
import { useNotification } from './NotificationManager';
import TokenSelector from './TokenSelector';
import SwapWithSavingsGasInfo from './SwapWithSavingsGasInfo';

export default function SwapWithSavings() {
  const { address, isConnected } = useAccount();
  const { addNotification } = useNotification();
  const { tokens, isLoading: isLoadingTokens } = useTokenList();
  const { strategy, isLoading: isLoadingStrategy } = useSpendSaveStrategy();
  const { tokenBalances, isLoading: isLoadingBalances } = useTokenBalances();
  
  // Token state
  const [fromToken, setFromToken] = useState<Token | null>(null);
  const [toToken, setToToken] = useState<Token | null>(null);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  
  // Savings customization
  const [disableSavingsForThisSwap, setDisableSavingsForThisSwap] = useState(false);
  const [overridePercentage, setOverridePercentage] = useState<number | null>(null);
  
  // DCA management
  const { 
    dcaEnabled, 
    dcaTargetToken,
    enableDCA,
    disableDCA,
    executeQueuedDCAs
  } = useDCAManagement();

  // Add state for validation error
  const [validationError, setValidationError] = useState<string | null>(null);
  
  // Set initial tokens once loaded
  useEffect(() => {
    if (tokens && tokens.length > 0 && !fromToken && !toToken) {
      try {
        setFromToken(tokens[0]);
        if (tokens.length > 1) {
          setToToken(tokens[1]);
        }
      } catch (error) {
        console.error("Error setting initial tokens:", error);
      }
    }
  }, [tokens, fromToken, toToken]);
  
  // Use the swap with savings hook
  const { 
    executionStatus,
    savedAmount,
    actualSwapAmount,
    estimatedOutput,
    executeSwap,
    isLoading: isSwapping,
    isSuccess,
    transactionHash,
    usingFallbackGas,
    error,
    gasEstimate,
    sizeCategory
  } = useSwapWithSavings(
    fromToken && toToken ? {
      fromToken: fromToken.symbol as 'ETH' | 'WETH' | 'USDC' | 'DAI',
      toToken: toToken.symbol as 'ETH' | 'WETH' | 'USDC' | 'DAI',
      amount: fromAmount,
      slippage: parseFloat(slippage),
      strategy,
      overridePercentage,
      disableSavings: disableSavingsForThisSwap
    } : null
  );
  
  // Update estimated output amount when it changes
  useEffect(() => {
    if (estimatedOutput && parseFloat(estimatedOutput) > 0) {
      setToAmount(estimatedOutput);
    }
  }, [estimatedOutput]);
  
  // Handle token swap button
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount("");
    setToAmount("");
  };
  
  // Calculate gas buffer - use fixed microamount for consistency
  const calculateGasBuffer = (): number => {
    // Set fixed gas buffer to 0.0005411 ETH (approximately $1)
    // This is extremely conservative to support micro-transactions
    return 0.0005411;
  };
  
  // Find and update handleMaxClick function
  const handleMaxClick = () => {
    if (!fromToken || !tokenBalances) return;
    
    try {
      let maxAmount = 0;
      
      if (fromToken.symbol === 'ETH') {
        const ethBalance = parseFloat(tokenBalances.ETH.formattedBalance);
        
        // Fixed gas buffer of 0.0005411 ETH (approximately $1)
        const gasBuffer = calculateGasBuffer();
        
        // Prevent negative values if balance is too small
        maxAmount = Math.max(0, ethBalance - gasBuffer);
        
        // If balance is too small to support a transaction
        if (ethBalance <= gasBuffer) {
          // Show notification
          addNotification({
            type: 'warning',
            title: 'Low ETH Balance',
            message: `Your ETH balance (${ethBalance.toFixed(4)} ETH) is too low to swap. Keep $1 (0.0005411 ETH) for gas fees.`
          });
          return; // Exit early
        }
      } else {
        // For non-ETH tokens, use full balance
        maxAmount = parseFloat(tokenBalances[fromToken.symbol].formattedBalance);
      }
      
      // Convert to a string with 6 decimal places max
      const formattedMaxAmount = maxAmount.toFixed(6);
      
      // Remove trailing zeros
      const trimmedMaxAmount = formattedMaxAmount.replace(/\.?0+$/, "");
      
      // Set the amount
      setFromAmount(trimmedMaxAmount);
      
      // Clear any validation errors
      setValidationError('');
    } catch (error) {
      console.error('Error calculating max amount:', error);
    }
  };
  
  // Handle from amount change
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    
    // Clear any existing validation errors when input changes
    if (validationError) {
      setValidationError(null);
    }
    
    // Perform real-time validation when user inputs amount
    if (value && fromToken && tokenBalances && tokenBalances[fromToken.symbol]) {
      const amount = parseFloat(value);
      const balance = parseFloat(tokenBalances[fromToken.symbol].formattedBalance);
      
      // Check if amount exceeds balance
      if (amount > balance) {
        setValidationError(`Insufficient ${fromToken.symbol} balance`);
      }
      // For ETH, also check if we're leaving enough for gas
      else if (fromToken.symbol === 'ETH') {
        const gasBuffer = calculateGasBuffer();
        if (amount > balance - gasBuffer) {
          setValidationError(`Leave $1 (${0.0005411} ETH) for gas fees`);
        }
      }
    }
  };
  
  // Handle token selection change
  const handleFromTokenChange = (token: Token) => {
    setFromToken(token);
  };
  
  const handleToTokenChange = (token: Token) => {
    setToToken(token);
  };
  
  // Handle slippage change
  const handleSlippageChange = (value: string) => {
    setSlippage(value);
  };
  
  // Validate amount before swap
  const validateSwapAmount = () => {
    if (!fromToken || !fromAmount) return false;
    
    // Get current balance
    const currentBalance = tokenBalances && tokenBalances[fromToken.symbol] 
      ? parseFloat(tokenBalances[fromToken.symbol].formattedBalance)
      : 0;
    
    // Amount user is trying to swap
    const amount = parseFloat(fromAmount);
    
    // For extremely small amounts (less than $5 in ETH), reduce the gas buffer
    if (fromToken.symbol === 'ETH' && amount < 0.003) {
      // For micro-transactions, use a tiny buffer of just 0.0003 ETH
      const microGasBuffer = 0.0003;
      return amount <= currentBalance - microGasBuffer;
    }
    
    // For ETH, ensure we're leaving enough for gas
    if (fromToken.symbol === 'ETH') {
      const gasBuffer = calculateGasBuffer();
      // Check if amount + gas buffer exceeds balance
      return amount <= currentBalance - gasBuffer;
    }
    
    // For other tokens, just check that amount doesn't exceed balance
    return amount <= currentBalance;
  };
  
  // Handle swap button click
  const handleSwapClick = () => {
    if (!isConnected || !fromAmount || parseFloat(fromAmount) <= 0) return;
    
    // Add validation check
    if (fromToken && fromToken.symbol === 'ETH' && !validateSwapAmount()) {
      addNotification({
        type: 'error',
        title: 'Insufficient Balance',
        message: 'You need to leave $1 (0.0005411 ETH) for gas fees. Try using a smaller amount or the MAX button.'
      });
      return;
    }
    
    setShowConfirmation(true);
  };
  
  // Handle confirmation
  const handleConfirmSwap = () => {
    setShowConfirmation(false);
    
    // Double-check validation before executing swap
    if (validateSwapAmount()) {
      executeSwap().catch(error => {
        console.error("Swap execution error:", error);
        
        // Check if it's an "insufficient funds" error
        if (error.message && error.message.includes("insufficient funds")) {
          addNotification({
            type: 'error',
            title: 'Insufficient Funds',
            message: 'You don\'t have enough ETH to cover this transaction. Try a smaller amount or the MAX button.'
          });
        } else {
          // Generic error handling
          addNotification({
            type: 'error',
            title: 'Transaction Failed',
            message: 'The swap transaction failed. Please try again later.'
          });
        }
      });
    } else {
      addNotification({
        type: 'error',
        title: 'Validation Failed',
        message: 'Transaction validation failed. Please try a smaller amount.'
      });
    }
  };
  
  // Event handlers
  const handleSavingsProcessed = (token: Address, amount: bigint) => {
    const tokenInfo = tokens.find(t => t.address === token);
    if (tokenInfo) {
      addNotification({
        type: 'success',
        title: 'Savings Processed',
        message: `Saved ${amount} ${tokenInfo.symbol}`
      });
    }
  };
  
  const handleDCAQueued = (fromToken: Address, toToken: Address, amount: bigint) => {
    const fromTokenInfo = tokens.find(t => t.address === fromToken);
    const toTokenInfo = tokens.find(t => t.address === toToken);
    if (fromTokenInfo && toTokenInfo) {
      addNotification({
        type: 'success',
        title: 'DCA Queued',
        message: `Queued ${amount} ${fromTokenInfo.symbol} for conversion to ${toTokenInfo.symbol}`
      });
    }
  };

  if (isLoadingTokens || isLoadingStrategy) {
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
    <>
      <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl shadow-lg p-6 border border-gray-800">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-white">Swap</h2>
          <button 
            onClick={() => setShowSettings(!showSettings)}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
          >
            <FiSettings className="text-gray-400" />
          </button>
        </div>
        
        {/* Settings panel */}
        {showSettings && (
          <div className="mb-4 bg-gray-800/40 rounded-xl p-4">
            <h3 className="text-white font-medium mb-3">Transaction Settings</h3>
            
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Slippage Tolerance</label>
              <div className="flex space-x-2">
                <button 
                  onClick={() => setSlippage("0.1")}
                  className={`px-3 py-1 rounded-md ${slippage === "0.1" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  0.1%
                </button>
                <button 
                  onClick={() => setSlippage("0.5")}
                  className={`px-3 py-1 rounded-md ${slippage === "0.5" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  0.5%
                </button>
                <button 
                  onClick={() => setSlippage("1.0")}
                  className={`px-3 py-1 rounded-md ${slippage === "1.0" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  1.0%
                </button>
                <input
                  type="text"
                  value={slippage}
                  onChange={(e) => handleSlippageChange(e.target.value)}
                  className="bg-gray-700 text-white rounded-md px-3 py-1 w-20 text-right"
                  placeholder="Custom"
                />
                <span className="text-white flex items-center">%</span>
              </div>
            </div>
            
            {strategy.isConfigured && (
              <div className="mb-4">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm text-gray-400">SpendSave Settings</label>
                  <div className="flex items-center">
                    <span className="text-blue-400 text-sm mr-1">Savings</span>
                    <div className="relative inline-block w-10 mr-2 align-middle select-none">
                      <input 
                        type="checkbox" 
                        checked={!disableSavingsForThisSwap}
                        onChange={() => setDisableSavingsForThisSwap(!disableSavingsForThisSwap)}
                        className="absolute block w-6 h-6 rounded-full bg-white border-4 border-gray-700 appearance-none cursor-pointer focus:outline-none transition duration-200 ease-in checked:translate-x-4 checked:bg-blue-500 checked:border-blue-700"
                      />
                      <label className="block overflow-hidden h-6 rounded-full bg-gray-700 cursor-pointer"></label>
                    </div>
                  </div>
                </div>
                
                {!disableSavingsForThisSwap && (
                  <div className="mb-3">
                    <label className="block text-sm text-gray-400 mb-2">Override Savings Percentage</label>
                    <div className="flex items-center">
                      <input
                        type="range"
                        min="1"
                        max="50"
                        value={overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}
                        onChange={(e) => setOverridePercentage(parseInt(e.target.value))}
                        className="w-full mr-3"
                      />
                      <span className="text-white w-12 text-center">{overridePercentage !== null ? overridePercentage : (strategy.currentPercentage / 100)}%</span>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        
        {/* From Token Input Field - Let's add the balance display and MAX button here */}
        <div className="bg-gray-800 rounded-xl p-4 mb-2">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">From</label>
            {fromToken && tokenBalances && tokenBalances[fromToken.symbol] && (
              <div className="text-xs text-gray-400 flex items-center">
                Balance: {tokenBalances[fromToken.symbol].formattedBalance}
                <button
                  onClick={handleMaxClick}
                  className="ml-2 text-xs bg-blue-600 hover:bg-blue-700 text-white px-2 py-0.5 rounded"
                  type="button"
                >
                  MAX
                </button>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-white text-xl w-full focus:outline-none font-medium"
              inputMode="decimal"
            />
            <TokenSelector
              value={fromToken}
              onChange={handleFromTokenChange}
              tokens={tokens}
              disabled={!isConnected || isLoadingTokens}
              isLoading={isLoadingTokens}
            />
          </div>
        </div>
        
        {/* Show validation error if exists */}
        {validationError && (
          <div className="mt-2 text-sm text-red-400">
            {validationError}
          </div>
        )}
        
        {/* Swap Button */}
        <div className="relative h-10 flex justify-center my-2">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-full border-t border-gray-800"></div>
          </div>
          <button
            onClick={handleSwapTokens}
            className="absolute bg-gray-800 rounded-full p-2 hover:bg-gray-700 z-10 transition-colors"
          >
            <FiArrowDown size={18} className="text-white" />
          </button>
        </div>
        
        {/* To Token Input Field */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">To</label>
            {toToken && tokenBalances && tokenBalances[toToken.symbol] && (
              <div className="text-xs text-gray-400">
                Balance: {tokenBalances[toToken.symbol].formattedBalance}
              </div>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="0.0"
              className="bg-transparent text-white text-xl w-full focus:outline-none font-medium"
            />
            <TokenSelector
              value={toToken}
              onChange={handleToTokenChange}
              tokens={tokens}
              disabled={!isConnected || isLoadingTokens}
              isLoading={isLoadingTokens}
            />
          </div>
        </div>
        
        {/* Savings info if enabled */}
        {strategy.isConfigured && !disableSavingsForThisSwap && fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="mb-4 bg-blue-900/10 border border-blue-800/20 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-300">Savings:</span>
              <span className="text-sm font-medium text-blue-400">
                {savedAmount} {fromToken?.symbol}
              </span>
            </div>
            
            {strategy.savingsTokenType === 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-300">Actual swap amount:</span>
                <span className="text-sm font-medium text-white">
                  {actualSwapAmount} {fromToken?.symbol}
                </span>
              </div>
            )}
            
            {strategy.enableDCA && dcaEnabled && dcaTargetToken && (
              <div className="flex items-center mt-2 text-xs text-purple-300">
                <FiInfo className="mr-1" />
                <span>Saved amount will be queued for conversion to {
                  tokens.find(t => t.address === dcaTargetToken)?.symbol
                }</span>
              </div>
            )}
          </div>
        )}
        
        {/* Swap Button */}
        <button
          disabled={!fromToken || !toToken || !fromAmount || !isConnected || isSwapping || parseFloat(fromAmount) <= 0 || validationError !== null}
          onClick={handleSwapClick}
          className={`w-full py-3 rounded-xl font-bold ${
            fromToken && toToken && fromAmount && isConnected && !isSwapping && parseFloat(fromAmount) > 0 && validationError === null
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          } transition-colors flex items-center justify-center`}
        >
          {!isConnected 
            ? "Connect Wallet" 
            : isSwapping 
              ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Swapping...
                </>
              ) 
              : !fromAmount || parseFloat(fromAmount) <= 0
                ? "Enter an amount"
                : validationError !== null
                  ? "Insufficient balance"
                  : "Swap"
          }
        </button>
        
        {/* Gas Info Display */}
        {fromToken && (
          <SwapWithSavingsGasInfo
            fromToken={fromToken.symbol}
            fromAmount={fromAmount}
            gasEstimate={gasEstimate}
            usingFallbackGas={usingFallbackGas}
            isLoading={isSwapping || executionStatus === 'preparing'}
          />
        )}

        {/* Transaction status */}
        {executionStatus === 'success' && (
          <div className="mt-4 p-3 bg-green-900/20 border border-green-800/30 rounded-lg text-sm text-green-400">
            Swap completed successfully! 
            {transactionHash && (
              <a 
                href={`https://sepolia.basescan.org/tx/${transactionHash}`} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center mt-1 text-blue-400 hover:text-blue-300"
              >
                View on explorer <FiExternalLink className="ml-1" />
              </a>
            )}
          </div>
        )}
        
        {executionStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-400">
            Swap failed. Please try again.
          </div>
        )}

        {error && (
          <div className="mt-2 p-2 bg-red-900/20 border border-red-800/30 rounded-lg text-sm text-red-400 flex items-center">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <span>{error.message}</span>
          </div>
        )}
      </div>
      
      {/* Confirmation Modal */}
      {fromToken && toToken && (
        <SwapConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSwap}
          fromToken={fromToken.symbol}
          toToken={toToken.symbol}
          fromAmount={fromAmount}
          toAmount={toAmount}
          strategy={strategy}
          overridePercentage={overridePercentage}
          disableSavings={disableSavingsForThisSwap}
          slippage={slippage}
          usingUniswapV4={true}
          dcaEnabled={dcaEnabled}
          dcaTargetToken={dcaTargetToken ? tokens.find(t => t.address === dcaTargetToken)?.symbol : undefined}
          usingFallbackGas={usingFallbackGas}
          gasEstimate={gasEstimate}
        />
      )}
      
      {/* Event Listeners */}
      <SpendSaveEventListeners
        onSavingsProcessed={handleSavingsProcessed}
        onDCAQueued={handleDCAQueued}
      />
    </>
  );
} 