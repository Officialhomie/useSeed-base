"use client";

import React, { useState, useEffect } from 'react';
import { useAccount } from 'wagmi';
import { Address, parseUnits } from 'viem';
import { SpendSaveStrategy } from '@/lib/hooks/useSpendSaveStrategy';
import useSwapWithSavings from '@/lib/hooks/useSwapWithSavings';
import useDCAManagement from '@/lib/hooks/useDCAManagement';
import { FiSettings, FiArrowDown, FiInfo } from 'react-icons/fi';
import SwapConfirmationModal from './SwapConfirmationModal';
import SpendSaveEventListeners from './SpendSaveEventListeners';
import { useNotification } from './NotificationManager';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

interface Token {
  symbol: string;
  name: string;
  address: Address;
  decimals: number;
  balance: string;
  price: number;
}

const TOKENS: Token[] = [
  { 
    symbol: "ETH", 
    name: "Ethereum", 
    address: CONTRACT_ADDRESSES.ETH, 
    decimals: 18, 
    balance: "0.45", 
    price: 1850 
  },
  { 
    symbol: "USDC", 
    name: "USD Coin", 
    address: CONTRACT_ADDRESSES.USDC, 
    decimals: 6, 
    balance: "1,240.50", 
    price: 1 
  },
  { 
    symbol: "WETH", 
    name: "Wrapped Ethereum", 
    address: CONTRACT_ADDRESSES.WETH, 
    decimals: 18, 
    balance: "0.35", 
    price: 1850 
  },
];

export default function SwapWithSavings() {
  const { address, isConnected } = useAccount();
  const { addNotification } = useNotification();
  
  // Token state
  const [fromToken, setFromToken] = useState<Token>(TOKENS[0]);
  const [toToken, setToToken] = useState<Token>(TOKENS[1]);
  const [fromAmount, setFromAmount] = useState("");
  const [toAmount, setToAmount] = useState("");
  
  // UI state
  const [showSettings, setShowSettings] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [slippage, setSlippage] = useState("0.5");
  
  // Savings customization
  const [disableSavingsForThisSwap, setDisableSavingsForThisSwap] = useState(false);
  const [overridePercentage, setOverridePercentage] = useState<number | null>(null);
  
  // Mock strategy for demonstration
  const [strategy, setStrategy] = useState<SpendSaveStrategy>({
    currentPercentage: 1000, // 10%
    autoIncrement: 0,
    maxPercentage: 2500, // 25%
    goalAmount: BigInt(0),
    roundUpSavings: true,
    enableDCA: true,
    savingsTokenType: 0, // INPUT
    specificSavingsToken: TOKENS[0].address,
    isConfigured: true
  });
  
  // DCA management
  const { 
    dcaEnabled, 
    dcaTargetToken,
    enableDCA,
    disableDCA,
    executeQueuedDCAs
  } = useDCAManagement();
  
  // Get the token by symbol
  const getTokenBySymbol = (symbol: string): Token => {
    return TOKENS.find(t => t.symbol === symbol) || TOKENS[0];
  };
  
  // Get the token symbol from address
  const getTokenSymbol = (address: Address): string => {
    const token = TOKENS.find(t => t.address === address);
    return token ? token.symbol : "Unknown";
  };
  
  // Use the swap with savings hook
  const { 
    executionStatus,
    savedAmount,
    actualSwapAmount,
    estimatedOutput,
    executeSwap,
    isLoading,
    isSuccess,
    transactionHash
  } = useSwapWithSavings({
    inputToken: fromToken,
    outputToken: toToken,
    amount: fromAmount,
    slippage: parseFloat(slippage),
    strategy,
    overridePercentage,
    disableSavings: disableSavingsForThisSwap
  });
  
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
  
  // Handle from amount change
  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
  };
  
  // Handle token selection change
  const handleFromTokenChange = (symbol: string) => {
    const newToken = getTokenBySymbol(symbol);
    setFromToken(newToken);
  };
  
  const handleToTokenChange = (symbol: string) => {
    const newToken = getTokenBySymbol(symbol);
    setToToken(newToken);
  };
  
  // Handle slippage change
  const handleSlippageChange = (value: string) => {
    setSlippage(value);
  };
  
  // Handle swap button click
  const handleSwapClick = () => {
    if (!isConnected || !fromAmount || parseFloat(fromAmount) <= 0) return;
    setShowConfirmation(true);
  };
  
  // Handle confirmation
  const handleConfirmSwap = () => {
    setShowConfirmation(false);
    executeSwap();
  };
  
  // Event handlers
  const handleSavingsProcessed = (token: Address, amount: bigint) => {
    // Could update UI or state here
    console.log(`Savings processed: ${amount} of token ${getTokenSymbol(token)}`);
  };
  
  const handleDCAQueued = (fromToken: Address, toToken: Address, amount: bigint) => {
    // Could update UI or show additional info here
    console.log(`DCA queued: ${amount} from ${getTokenSymbol(fromToken)} to ${getTokenSymbol(toToken)}`);
  };

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
        
        {/* From Token */}
        <div className="mb-2 bg-gray-800/40 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">From</label>
            <span className="text-xs text-gray-400">
              Balance: {fromToken.balance} {fromToken.symbol}
            </span>
          </div>
          <div className="flex justify-between items-center">
            <input
              type="text"
              value={fromAmount}
              onChange={(e) => handleFromAmountChange(e.target.value)}
              placeholder="0.0"
              className="bg-transparent text-xl font-semibold focus:outline-none w-3/5"
            />
            <select
              value={fromToken.symbol}
              onChange={(e) => handleFromTokenChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg font-medium"
            >
              {TOKENS.map(token => (
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
            onClick={handleSwapTokens}
            className="absolute bg-gray-800 rounded-full p-2 hover:bg-gray-700 z-10 transition-colors"
          >
            <FiArrowDown size={18} className="text-white" />
          </button>
        </div>
        
        {/* To Token */}
        <div className="mb-4 bg-gray-800/40 rounded-xl p-4">
          <div className="flex justify-between mb-2">
            <label className="text-sm text-gray-400">To</label>
            <span className="text-xs text-gray-400">
              Balance: {toToken.balance} {toToken.symbol}
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
              value={toToken.symbol}
              onChange={(e) => handleToTokenChange(e.target.value)}
              className="bg-gray-700 text-white px-3 py-2 rounded-lg font-medium"
            >
              {TOKENS.map(token => (
                <option key={token.symbol} value={token.symbol}>
                  {token.symbol}
                </option>
              ))}
            </select>
          </div>
        </div>
        
        {/* Savings info if enabled */}
        {strategy.isConfigured && !disableSavingsForThisSwap && fromAmount && parseFloat(fromAmount) > 0 && (
          <div className="mb-4 bg-blue-900/10 border border-blue-800/20 rounded-xl p-3">
            <div className="flex justify-between items-center mb-1">
              <span className="text-sm text-gray-300">Savings:</span>
              <span className="text-sm font-medium text-blue-400">
                {savedAmount} {fromToken.symbol}
              </span>
            </div>
            
            {strategy.savingsTokenType === 0 && (
              <div className="flex justify-between items-center mb-1">
                <span className="text-sm text-gray-300">Actual swap amount:</span>
                <span className="text-sm font-medium text-white">
                  {actualSwapAmount} {fromToken.symbol}
                </span>
              </div>
            )}
            
            {strategy.enableDCA && dcaEnabled && dcaTargetToken && (
              <div className="flex items-center mt-2 text-xs text-purple-300">
                <FiInfo className="mr-1" />
                <span>Saved amount will be queued for conversion to {getTokenSymbol(dcaTargetToken)}</span>
              </div>
            )}
          </div>
        )}
        
        {/* Swap Button */}
        <button
          disabled={!fromAmount || !isConnected || isLoading || parseFloat(fromAmount) <= 0}
          onClick={handleSwapClick}
          className={`w-full py-3 rounded-xl font-bold ${
            fromAmount && isConnected && !isLoading && parseFloat(fromAmount) > 0
              ? "bg-blue-600 hover:bg-blue-500 text-white"
              : "bg-gray-700 text-gray-400 cursor-not-allowed"
          } transition-colors flex items-center justify-center`}
        >
          {!isConnected 
            ? "Connect Wallet" 
            : isLoading 
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
                : "Swap"
          }
        </button>
        
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
      </div>
      
      {/* Confirmation Modal */}
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
        gasEstimate="~0.002 ETH"
        usingUniswapV4={true}
        dcaEnabled={dcaEnabled}
        dcaTargetToken={dcaTargetToken ? getTokenSymbol(dcaTargetToken) : undefined}
      />
      
      {/* Event Listeners */}
      <SpendSaveEventListeners
        onSavingsProcessed={handleSavingsProcessed}
        onDCAQueued={handleDCAQueued}
      />
    </>
  );
} 