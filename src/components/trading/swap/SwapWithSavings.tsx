"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount } from 'wagmi';
import { Address } from 'viem';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import useSwapWithSavings from '@/lib/hooks/useSwapWithSavings';
import useDCAManagement from '@/lib/hooks/useDCAManagement';
import useSpendSaveStrategy from '@/lib/hooks/useSpendSaveStrategy';
import { useTokenList, Token } from '@/lib/hooks/useTokenList';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import { FiSettings, FiArrowDown, FiInfo, FiExternalLink, FiTarget, FiAlertTriangle, FiCheckCircle, FiClock } from 'react-icons/fi';
import SwapConfirmationModal from '@/components/trading/swap/SwapConfirmationModal';
import SpendSaveEventListeners from '@/components/wallet/SpendSaveEventListeners';
import { useNotification } from '@/components/core/NotificationManager';
import TokenSelector from '@/components/tokens/TokenSelector';
import { TokenPriceDisplay } from '@/components/tokens/TokenPriceDisplay';
import SwapWithSavingsGasInfo from '@/components/trading/swap/SwapWithSavingsGasInfo';
import SpendSaveStrategyModal from '@/components/savings/setup/SpendSaveStrategyModal';
import SavingsRatioIndicator from '@/components/savings/visualisation/SavingsRatioIndicator';
import { GasPriceCategory } from '@/lib/hooks/useGasPrice';
import { cn } from '@/lib/utils';
import SavingsSummary from '@/components/savings/overview/SavingsSummary';
import useSavingsPreview from '@/lib/hooks/useSavingsPreview';

// ========== PHASE 3: Import Approval Components ==========
import { 
  ApprovalStatusBanner, 
  ApprovalManager, 
  ApprovalProgress, 
  CompactApprovalStatus 
} from '@/components/tokens/TokenApprovalComponents';

// ========== PHASE 2: Strategy Setup Modal Component ==========
const StrategySetupModal = ({ 
  isOpen, 
  onClose, 
  onSetupStrategy, 
  isLoading = false 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSetupStrategy: (params: any) => Promise<void>;
  isLoading?: boolean;
}) => {
  const [percentage, setPercentage] = useState(5); // Default 5%
  const [savingsTokenType, setSavingsTokenType] = useState<0 | 1 | 2>(0); // INPUT
  const [enableDCA, setEnableDCA] = useState(false);

  const handleSetup = async () => {
    try {
      await onSetupStrategy({
        percentage,
        savingsTokenType,
        enableDCA,
        roundUpSavings: false,
        autoIncrement: 0,
        maxPercentage: percentage * 2 // Allow up to double the initial percentage
      });
      onClose();
    } catch (error) {
      console.error('Strategy setup failed:', error);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-md bg-gray-900 rounded-2xl shadow-xl p-6 m-4">
        <h2 className="text-xl font-bold text-white mb-4">Set Up Savings Strategy</h2>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Savings Percentage</label>
            <div className="flex items-center space-x-3">
              <input
                type="range"
                min="1"
                max="25"
                value={percentage}
                onChange={(e) => setPercentage(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-white w-12 text-center">{percentage}%</span>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              Recommended: 5-10% for regular savings
            </p>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-2">Savings Type</label>
            <div className="space-y-2">
              <label className="flex items-center">
                <input
                  type="radio"
                  value={0}
                  checked={savingsTokenType === 0}
                  onChange={() => setSavingsTokenType(0)}
                  className="mr-2"
                />
                <span className="text-white text-sm">Save from input token (before swap)</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value={1}
                  checked={savingsTokenType === 1}
                  onChange={() => setSavingsTokenType(1)}
                  className="mr-2"
                />
                <span className="text-white text-sm">Save from output token (after swap)</span>
              </label>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-400">Enable DCA</label>
            <input
              type="checkbox"
              checked={enableDCA}
              onChange={(e) => setEnableDCA(e.target.checked)}
              className="rounded"
            />
          </div>
        </div>

        <div className="flex space-x-4 mt-6">
          <button
            onClick={onClose}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-bold bg-gray-800 text-gray-300 hover:bg-gray-700 transition-colors disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            onClick={handleSetup}
            disabled={isLoading}
            className="flex-1 py-3 rounded-xl font-bold bg-blue-600 hover:bg-blue-500 text-white transition-colors disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Setting up...
              </>
            ) : (
              'Set Up Strategy'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ========== PHASE 2: Strategy Status Banner Component ==========
const StrategyStatusBanner = ({ 
  validation, 
  isValidating, 
  onSetupStrategy,
  disableSavings 
}: {
  validation: any;
  isValidating: boolean;
  onSetupStrategy: () => void;
  disableSavings: boolean;
}) => {
  if (disableSavings || validation.isValid) return null;

  const hasErrors = validation.errors.length > 0;
  const hasWarnings = validation.warnings.length > 0;

  return (
    <div className={cn(
      "mb-4 p-3 rounded-lg border",
      hasErrors ? "bg-red-900/20 border-red-800/40" : "bg-yellow-900/20 border-yellow-800/40"
    )}>
      <div className="flex items-start space-x-2">
        {isValidating ? (
          <FiClock className="text-blue-400 mt-0.5 animate-pulse" />
        ) : hasErrors ? (
          <FiAlertTriangle className="text-red-400 mt-0.5" />
        ) : (
          <FiInfo className="text-yellow-400 mt-0.5" />
        )}
        
        <div className="flex-1">
          <h4 className={cn(
            "text-sm font-medium mb-1",
            hasErrors ? "text-red-400" : "text-yellow-400"
          )}>
            {isValidating ? 'Validating Strategy...' : 
             hasErrors ? 'Strategy Setup Required' : 
             'Strategy Warnings'}
          </h4>
          
          {!isValidating && (
            <div className="space-y-1">
              {validation.errors.map((error: string, index: number) => (
                <p key={index} className="text-sm text-red-300">{error}</p>
              ))}
              {validation.warnings.map((warning: string, index: number) => (
                <p key={index} className="text-sm text-yellow-300">{warning}</p>
              ))}
            </div>
          )}
          
          {validation.needsSetup && !isValidating && (
            <button
              onClick={onSetupStrategy}
              className="mt-2 text-sm bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded"
            >
              Set Up Savings Strategy
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

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
  const [showStrategyModal, setShowStrategyModal] = useState(false);
  
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
  
  // New state for gas price
  const [selectedGasPrice, setSelectedGasPrice] = useState<GasPriceCategory>('standard');
  const [customGasPrice, setCustomGasPrice] = useState<number | null>(null);
  
  // Memoize swap parameters to prevent unnecessary re-renders and API calls
  const swapParams = useMemo(() => {
    if (!fromToken || !toToken) return null;
    
    return {
      fromToken: fromToken.symbol as 'ETH' | 'WETH' | 'USDC',
      toToken: toToken.symbol as 'ETH' | 'WETH' | 'USDC',
      amount: fromAmount,
      slippage: parseFloat(slippage),
      strategy,
      overridePercentage,
      disableSavings: disableSavingsForThisSwap,
      customGasPrice: customGasPrice,
      gasPriceCategory: selectedGasPrice
    };
  }, [
    fromToken?.symbol, 
    toToken?.symbol, 
    // Only update when amount changes by at least 0.0001
    fromAmount && parseFloat(fromAmount) > 0 ? parseFloat(fromAmount).toFixed(4) : "0",
    slippage,
    strategy.isConfigured && !disableSavingsForThisSwap ? strategy.currentPercentage : 0,
    overridePercentage,
    disableSavingsForThisSwap,
    customGasPrice,
    selectedGasPrice
  ]);
  
  // Use the swap with savings hook with memoized parameters (REMOVED estimatedOutput)
  const { 
    executionStatus,
    savedAmount,
    actualSwapAmount,
    executeSwap,
    isLoading: isSwapping,
    isSuccess,
    transactionHash,
    usingFallbackGas,
    error,
    gasEstimate,
    sizeCategory,
    estimatedGasLimit,
    savingsPreview,
    // ========== PHASE 2: New strategy-related properties ==========
    strategyValidation,
    isValidatingStrategy,
    isSettingUpStrategy,
    setupStrategy,
    canExecuteSwap,
    strategySetupRequired,
    // ========== PHASE 3: Approval-related properties ==========
    approvalStatus,
    approvalState,
    isCheckingApprovals,
    isApprovingTokens,
    needsApprovals,
    approveAllTokens,
    refreshApprovals,
    canProceedWithApprovals
  } = useSwapWithSavings(swapParams);
  
  // REMOVED: The useEffect that was trying to use estimatedOutput since we don't have quotes anymore
  // The toAmount field will now remain as a read-only placeholder
  
  // Get actual swap amount function for SavingsSummary
  const getActualSwapAmount = useCallback(() => {
    return actualSwapAmount || fromAmount;
  }, [actualSwapAmount, fromAmount]);
  
  // Get savings amount function for SavingsSummary
  const calculateSavingsAmount = useCallback(() => {
    return savingsPreview?.formattedAmount || savedAmount || '0';
  }, [savingsPreview, savedAmount]);

  // Show the Savings Preview if applicable
  const showSavingsPreview = fromToken && 
    strategy.isConfigured && 
    !disableSavingsForThisSwap && 
    fromAmount && 
    parseFloat(fromAmount) > 0 &&
    savingsPreview?.percentage > 0;
  
  // Handle token swap button
  const handleSwapTokens = () => {
    const temp = fromToken;
    setFromToken(toToken);
    setToToken(temp);
    setFromAmount("");
    setToAmount("");
  };
  
  // Handle gas price selection from the selector
  const handleGasPriceSelect = (category: GasPriceCategory, price: number) => {
    setSelectedGasPrice(category);
    setCustomGasPrice(price);
  };
  
  // Calculate gas buffer using the dynamic gas estimator instead of hardcoded value
  const calculateGasBuffer = (): number => {
    // Base estimate on transaction size category
    const bufferMap: {[key: string]: number} = {
      'MICRO': 0.0004, // ~$1 at $2500/ETH
      'SMALL': 0.0006, // ~$1.50 at $2500/ETH
      'MEDIUM': 0.0008, // ~$2 at $2500/ETH
      'LARGE': 0.001 // ~$2.50 at $2500/ETH
    };
    
    // Default to medium if sizeCategory not available yet
    const bufferAmount = bufferMap[sizeCategory || 'MEDIUM'];
    
    // Add 20% to buffer if customGasPrice is higher than standard
    if (customGasPrice && customGasPrice > 50) { // High gas price threshold
      return bufferAmount * 1.2;
    }
    
    return bufferAmount;
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
    
    // Clear the toAmount since we don't have quote functionality
    setToAmount("");
    
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
    // Clear amounts when changing tokens since we don't have quotes
    setFromAmount("");
    setToAmount("");
  };
  
  const handleToTokenChange = (token: Token) => {
    setToToken(token);
    // Clear amounts when changing tokens since we don't have quotes
    setFromAmount("");
    setToAmount("");
  };
  
  // Handle slippage change
  const handleSlippageChange = (value: string) => {
    setSlippage(value);
  };
  
  // Validate amount before swap
  const validateSwapAmount = (amount: string, balance: string, isEth: boolean, gasBuffer: number): string | null => {
    if (!amount || !balance) return null;
    
    const amountValue = parseFloat(amount);
    const balanceValue = parseFloat(balance);
    
    if (isNaN(amountValue) || isNaN(balanceValue)) return null;
    
    // Check if amount exceeds balance
    if (amountValue > balanceValue) {
      return `Insufficient balance`;
    }
    
    // For ETH, check if we're leaving enough for gas
    if (isEth && amountValue > balanceValue - gasBuffer) {
      return `Leave ~${gasBuffer.toFixed(4)} ETH for gas fees`;
    }
    
    return null;
  };
  
  // ========== PHASE 2: Strategy Setup Handler ==========
  const handleStrategySetup = async (params: any) => {
    try {
      console.log('PHASE 2: Setting up strategy from UI:', params);
      
      const success = await setupStrategy(params);
      
      if (success) {
        addNotification({
          type: 'success',
          title: 'Strategy Set Up',
          message: `Savings strategy configured: ${params.percentage}% savings`
        });
        setShowStrategySetupModal(false);
      }
    } catch (error) {
      console.error('PHASE 2: Strategy setup failed:', error);
      addNotification({
        type: 'error',
        title: 'Strategy Setup Failed',
        message: error instanceof Error ? error.message : 'Failed to set up strategy'
      });
    }
  };

  // ========== PHASE 3: Approval Management Handlers ==========
  const handleApproveAll = async () => {
    try {
      console.log('PHASE 3: Approving all tokens from UI...');
      const success = await approveAllTokens();
      
      if (success) {
        addNotification({
          type: 'success',
          title: 'Approvals Complete',
          message: 'All token approvals completed successfully'
        });
      }
    } catch (error) {
      console.error('PHASE 3: Approval failed:', error);
      addNotification({
        type: 'error',
        title: 'Approval Failed',
        message: error instanceof Error ? error.message : 'Failed to approve tokens'
      });
    }
  };

  const handleRefreshApprovals = async () => {
    try {
      console.log('PHASE 3: Refreshing approvals from UI...');
      await refreshApprovals();
    } catch (error) {
      console.error('PHASE 3: Refresh failed:', error);
      addNotification({
        type: 'error',
        title: 'Refresh Failed',
        message: 'Failed to refresh approval status'
      });
    }
  };

  // ========== PHASE 2: Show strategy setup modal when needed ==========
  const [showStrategySetupModal, setShowStrategySetupModal] = useState(false);
  useEffect(() => {
    if (strategySetupRequired && !showStrategySetupModal && !isValidatingStrategy) {
      setShowStrategySetupModal(true);
    }
  }, [strategySetupRequired, showStrategySetupModal, isValidatingStrategy]);

  // ========== PHASE 2: Enhanced Swap Button Handler ==========
  const handleSwapClick = () => {
    if (!isConnected || !fromAmount || parseFloat(fromAmount) <= 0) return;
    
    // PHASE 2: Check if strategy validation passed
    if (!canExecuteSwap) {
      if (strategySetupRequired) {
        addNotification({
          type: 'warning',
          title: 'Strategy Setup Required',
          message: 'Please set up your savings strategy before swapping.'
        });
        setShowStrategySetupModal(true);
        return;
      }
      
      if (strategyValidation.errors.length > 0) {
        addNotification({
          type: 'error',
          title: 'Strategy Validation Failed',
          message: strategyValidation.errors[0]
        });
        return;
      }
      
      // PHASE 3: Check approval status
      if (needsApprovals && !canProceedWithApprovals) {
        addNotification({
          type: 'warning',
          title: 'Token Approvals Required',
          message: 'Please approve tokens for swapping and savings functionality.'
        });
        return;
      }
      
      addNotification({
        type: 'warning',
        title: 'Cannot Execute Swap',
        message: 'Strategy validation in progress. Please wait.'
      });
      return;
    }
    
    // Original validation
    if (fromToken && fromToken.symbol === 'ETH' && tokenBalances) {
      const amount = parseFloat(fromAmount);
      const balance = parseFloat(tokenBalances.ETH.formattedBalance);
      const gasBuffer = calculateGasBuffer();
      
      if (amount > balance - gasBuffer) {
        addNotification({
          type: 'error',
          title: 'Insufficient Balance',
          message: 'You need to leave $1 (0.0005411 ETH) for gas fees. Try using a smaller amount or the MAX button.'
        });
        return;
      }
    }
    
    setShowConfirmation(true);
  };

  // Handle confirmation
  const handleConfirmSwap = () => {
    setShowConfirmation(false);
    executeSwap().catch(error => {
      console.error("PHASE 2: Swap execution error:", error);
      if (error.message && error.message.includes("insufficient funds")) {
        addNotification({
          type: 'error',
          title: 'Insufficient Funds',
          message: 'You don\'t have enough ETH to cover this transaction. Try a smaller amount or the MAX button.'
        });
      } else if (error.message && error.message.includes("PHASE 2 Strategy Error:")) {
        // Strategy-specific errors
        addNotification({
          type: 'error',
          title: 'Strategy Error',
          message: error.message.replace("PHASE 2 Strategy Error: ", "")
        });
      } else {
        addNotification({
          type: 'error',
          title: 'Transaction Failed',
          message: 'The swap transaction failed. Please try again later.'
        });
      }
    });
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

  // Add this function to handle strategy saving
  const handleSaveStrategy = (newStrategy: any) => {
    // Handle saving the strategy
    console.log('Saving strategy:', newStrategy);
    setShowStrategyModal(false);
  };

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
      {/* Token Price Display */}
      <TokenPriceDisplay />
    
      <div className="w-full max-w-md mx-auto bg-gray-900 rounded-2xl shadow-lg p-4 sm:p-6 border border-gray-800">
        <div className="flex justify-between items-center mb-4 sm:mb-6">
          <h2 className="text-lg sm:text-xl font-bold text-white">Swap</h2>
          <div className="flex space-x-2">
            <button
              onClick={() => setShowStrategyModal(true)}
              className="p-1.5 sm:p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Savings Strategy"
            >
              <FiTarget className="text-green-400 h-4 w-4 sm:h-5 sm:w-5" />
            </button>
            <button 
              onClick={() => setShowSettings(!showSettings)}
              className="p-1.5 sm:p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
              title="Transaction Settings"
            >
              <FiSettings className="text-gray-400 h-4 w-4 sm:h-5 sm:w-5" />
            </button>
          </div>
        </div>
        
        {/* ========== PHASE 2: Strategy Status Banner ========== */}
        <StrategyStatusBanner
          validation={strategyValidation}
          isValidating={isValidatingStrategy}
          onSetupStrategy={() => setShowStrategySetupModal(true)}
          disableSavings={disableSavingsForThisSwap}
        />
        {/* ========== PHASE 3: Approval Status and Management ========== */}
        <ApprovalStatusBanner
          approvalStatus={approvalStatus}
          approvalState={approvalState}
          token={fromToken?.symbol || ''}
          amount={fromAmount}
          onApproveAll={handleApproveAll}
          onRefresh={handleRefreshApprovals}
          enabled={!disableSavingsForThisSwap && fromToken?.symbol !== 'ETH'}
        />
        <ApprovalProgress
          approvalStatus={approvalStatus}
          approvalState={approvalState}
        />
        {/* Settings panel */}
        {showSettings && (
          <div className="mb-4 bg-gray-800/40 rounded-xl p-3 sm:p-4">
            <h3 className="text-white font-medium mb-2 sm:mb-3">Transaction Settings</h3>
            <div className="mb-4">
              <label className="block text-sm text-gray-400 mb-2">Slippage Tolerance</label>
              <div className="flex flex-wrap gap-2">
                <button 
                  onClick={() => setSlippage("0.1")}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${slippage === "0.1" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  0.1%
                </button>
                <button 
                  onClick={() => setSlippage("0.5")}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${slippage === "0.5" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  0.5%
                </button>
                <button 
                  onClick={() => setSlippage("1.0")}
                  className={`px-2 sm:px-3 py-1 rounded-md text-xs sm:text-sm ${slippage === "1.0" ? "bg-blue-600 text-white" : "bg-gray-700 text-gray-300"}`}
                >
                  1.0%
                </button>
                <div className="flex items-center">
                  <input
                    type="text"
                    value={slippage}
                    onChange={(e) => handleSlippageChange(e.target.value)}
                    className="bg-gray-700 text-white rounded-md px-2 sm:px-3 py-1 w-14 sm:w-20 text-right text-xs sm:text-sm"
                    placeholder="Custom"
                  />
                  <span className="text-white flex items-center text-xs sm:text-sm ml-1">%</span>
                </div>
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
            {/* ========== PHASE 3: Advanced Approval Manager in Settings ========== */}
            <ApprovalManager
              approvalStatus={approvalStatus}
              approvalState={approvalState}
              token={fromToken?.symbol || ''}
              amount={fromAmount}
              onApprovePoolManager={async () => {
                // This would call the individual approval function
                return await handleApproveAll();
              }}
              onApproveHook={async () => {
                // This would call the individual approval function  
                return await handleApproveAll();
              }}
              onApproveAll={async () => {
                return await handleApproveAll();
              }}
              onRefresh={handleRefreshApprovals}
              enabled={!disableSavingsForThisSwap && fromToken?.symbol !== 'ETH'}
            />
          </div>
        )}
        
        {/* From Token Input Field - Let's add the balance display and MAX button here */}
        <div className="bg-gray-800 rounded-xl p-3 sm:p-4 mb-2">
          <div className="flex flex-wrap justify-between items-center mb-2">
            <label className="text-xs sm:text-sm text-gray-400">From</label>
            {fromToken && tokenBalances && tokenBalances[fromToken.symbol] && (
              <div className="text-xs text-gray-400 flex items-center mt-1 sm:mt-0">
                <span className="whitespace-nowrap">Balance: {tokenBalances[fromToken.symbol].formattedBalance}</span>
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
              className="bg-transparent text-white text-lg sm:text-xl w-full focus:outline-none font-medium"
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
        
        {/* To Token Input Field - Now shows as placeholder since we don't have quotes */}
        <div className="bg-gray-800 rounded-xl p-3 sm:p-4 mb-4">
          <div className="flex flex-wrap justify-between items-center mb-2">
            <label className="text-xs sm:text-sm text-gray-400">To</label>
            {toToken && tokenBalances && tokenBalances[toToken.symbol] && (
              <div className="text-xs text-gray-400 mt-1 sm:mt-0">
                <span className="whitespace-nowrap">Balance: {tokenBalances[toToken.symbol].formattedBalance}</span>
              </div>
            )}
          </div>
          <div className="flex items-center">
            <input
              type="text"
              value={toAmount}
              readOnly
              placeholder="Output amount (execute swap to see)"
              className="bg-transparent text-gray-500 text-lg sm:text-xl w-full focus:outline-none font-medium"
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

            {/* Add SavingsRatioIndicator */}
            {savedAmount && actualSwapAmount && (
              <SavingsRatioIndicator 
                savingsAmount={savedAmount}
                actualSwapAmount={actualSwapAmount}
              />
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
        
        {/* Below the swap button, add the gas info component */}
        {fromToken && fromToken.symbol === 'ETH' && fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="mt-4">
            <SwapWithSavingsGasInfo 
              gasLimit={estimatedGasLimit || 250000}
              onGasPriceSelect={handleGasPriceSelect}
              className="mt-4"
            />
          </div>
        )}
        
        {/* Show any transaction errors */}
        {error && (
          <div className={cn(
            "mt-4 p-3 rounded-lg text-sm",
            "bg-red-900/20 border border-red-800/40 text-red-400"
          )}>
            <div className="font-medium">Transaction Error</div>
            <div className="text-xs mt-1">{error.message || String(error)}</div>
          </div>
        )}
        
        {/* Swap Success Summary - Show after successful swap */}
        {isSuccess && (
          <SavingsSummary
            fromToken={fromToken?.symbol || ''}
            fromAmount={fromAmount}
            toToken={toToken?.symbol || ''}
            toAmount={toAmount}
            getActualSwapAmount={getActualSwapAmount}
            calculateSavingsAmount={calculateSavingsAmount}
          />
        )}
        
        {/* Show Savings Preview */}
        {showSavingsPreview && (
          <div className="mt-2 mb-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-sm font-medium text-blue-400">Savings Preview</h4>
              <span className="text-xs bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded">
                {savingsPreview.percentage}% of swap
              </span>
            </div>
            <div className="text-xs space-y-1">
              <p>
                <span className="text-gray-400">You'll save: </span>
                <span className="text-white">{savingsPreview.formattedAmount} {fromToken?.symbol}</span>
              </p>
              <p>
                <span className="text-gray-400">Actual swap amount: </span>
                <span className="text-white">{actualSwapAmount} {fromToken?.symbol}</span>
              </p>
            </div>
          </div>
        )}
        
        {/* ========== PHASE 2 & 3: Enhanced Swap Button with Strategy + Approval Validation ========== */}
        <button
          disabled={
            !fromToken || 
            !toToken || 
            !fromAmount || 
            !isConnected || 
            isSwapping || 
            parseFloat(fromAmount) <= 0 || 
            validationError !== null ||
            !canExecuteSwap || // Combined strategy + approval validation
            isValidatingStrategy || 
            isSettingUpStrategy || 
            isCheckingApprovals || // PHASE 3: Don't allow while checking approvals
            isApprovingTokens || // PHASE 3: Don't allow while approving
            executionStatus === 'validating-strategy' || 
            executionStatus === 'setting-strategy'
          }
          onClick={handleSwapClick}
          className={`w-full py-2.5 sm:py-3 rounded-xl text-sm sm:text-base font-bold ${
            fromToken && toToken && fromAmount && isConnected && !isSwapping && parseFloat(fromAmount) > 0 && 
            validationError === null && canExecuteSwap && !isValidatingStrategy && !isSettingUpStrategy &&
            !isCheckingApprovals && !isApprovingTokens &&
            executionStatus !== 'validating-strategy' && executionStatus !== 'setting-strategy'
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
            : isValidatingStrategy || executionStatus === 'validating-strategy'
              ? "Validating Strategy..."
            : isSettingUpStrategy || executionStatus === 'setting-strategy'
              ? "Setting Up Strategy..."
            : isCheckingApprovals // PHASE 3: Checking approvals state
              ? "Checking Approvals..."
            : isApprovingTokens // PHASE 3: Approving tokens state
              ? "Approving Tokens..."
            : !fromAmount || parseFloat(fromAmount) <= 0
              ? "Enter an amount"
            : validationError !== null
              ? "Insufficient balance"
            : strategySetupRequired
              ? "Set Up Savings Strategy"
            : needsApprovals && !canProceedWithApprovals // PHASE 3: Needs approvals
              ? "Approve Tokens"
            : !canExecuteSwap && strategyValidation.errors.length > 0
              ? "Fix Strategy Issues"
            : "Swap"
          }
        </button>
      </div>
      
      {/* Confirmation modal */}
      {showConfirmation && (
        <SwapConfirmationModal
          isOpen={showConfirmation}
          onClose={() => setShowConfirmation(false)}
          onConfirm={handleConfirmSwap}
          fromToken={fromToken?.symbol || ''}
          toToken={toToken?.symbol || ''}
          fromAmount={fromAmount}
          toAmount={toAmount}
          strategy={strategy}
          overridePercentage={overridePercentage}
          disableSavings={disableSavingsForThisSwap}
          slippage={slippage}
          dcaEnabled={dcaEnabled}
          dcaTargetToken={dcaTargetToken ? dcaTargetToken.toString() : undefined}
          gasEstimate={gasEstimate || '0'}
          gasPriceGwei={customGasPrice ? customGasPrice.toString() : '30'}
          gasPriceCategory={selectedGasPrice}
          savedAmount={savedAmount || '0'}
          actualSwapAmount={actualSwapAmount || '0'}
          isLoading={isSwapping}
          usingFallbackGas={usingFallbackGas}
        />
      )}
      
      {/* Strategy modal */}
      {showStrategyModal && (
        <SpendSaveStrategyModal
          isOpen={showStrategyModal}
          onClose={() => setShowStrategyModal(false)}
          onStrategyChange={handleSaveStrategy}
          strategy={strategy}
        />
      )}
      
      {/* ========== PHASE 2: Strategy Setup Modal ========== */}
      {showStrategySetupModal && (
        <StrategySetupModal
          isOpen={showStrategySetupModal}
          onClose={() => setShowStrategySetupModal(false)}
          onSetupStrategy={handleStrategySetup}
          isLoading={isSettingUpStrategy}
        />
      )}
      
      {/* Event listeners for notifications */}
      <SpendSaveEventListeners
        onSavingsProcessed={handleSavingsProcessed}
        onDCAQueued={handleDCAQueued}
      />
    </>
  );
}