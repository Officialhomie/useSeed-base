'use client';

import React, { useState, useEffect, Suspense } from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
  WalletDropdownLink,
  WalletDropdownBasename,
} from '@coinbase/onchainkit/wallet';
import {
  Address,
  Avatar,
  Name,
  Identity,
  EthBalance,
} from '@coinbase/onchainkit/identity';
import {
  useAccount,
  useReadContract,
  useWriteContract,
  useBalance,
  useWaitForTransactionReceipt
} from 'wagmi';
import DailySavingsABI from '../ABI/DailySavings.json';
import SavingABI from '../ABI/Saving.json';
import TokenABI from '../ABI/Token.json';
import SlippageControlABI from '../ABI/SlippageControl.json';
import './spendsave-wallet.css';
import { formatUnits } from 'viem';
import { toast } from 'react-hot-toast';
import { parseEther } from 'ethers';

// Contract addresses - for production, use environment variables
const DAILY_SAVINGS_CONTRACT = process.env.NEXT_PUBLIC_DAILY_SAVINGS_ADDRESS || "0x0000000000000000000000000000000000000000";
const SAVINGS_CONTRACT = process.env.NEXT_PUBLIC_SAVINGS_ADDRESS || "0x0000000000000000000000000000000000000000";
const TOKEN_CONTRACT = process.env.NEXT_PUBLIC_TOKEN_ADDRESS || "0x0000000000000000000000000000000000000000";
const DEFAULT_TOKEN = process.env.NEXT_PUBLIC_DEFAULT_TOKEN || "0x0000000000000000000000000000000000000000";

// Define types for API response
interface SavingsStatus {
  enabled: boolean;
  dailyAmount: bigint;
  goalAmount: bigint;
  currentAmount: bigint;
  remainingAmount: bigint;
  penaltyAmount: bigint;
  estimatedCompletionDate: bigint;
}

interface ExecutionStatus {
  canExecute: boolean;
  nextExecutionTime: bigint;
  amountToSave: bigint;
}

// Error boundary component
const ErrorBoundary = ({ children, fallback }: { children: React.ReactNode, fallback: React.ReactNode }) => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = () => setHasError(true);
    window.addEventListener('error', errorHandler);
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return hasError ? <>{fallback}</> : <>{children}</>;
};

// Loading fallback
const LoadingFallback = () => (
  <div className="ss-loading-fallback">
    <div className="ss-loading-spinner"></div>
    <span>Loading wallet data...</span>
  </div>
);

// Stats fallback
const StatsFallback = () => (
  <div className="ss-stats-wrapper">
    <div className="ss-stats-header">
      <span className="ss-stats-icon">📊</span>
      <h3>Your Savings Stats</h3>
    </div>
    <div className="ss-stats-grid">
      <div className="ss-stat-item ss-stat-skeleton">
        <span className="ss-stat-label">Total Saved</span>
        <span className="ss-stat-value ss-skeleton-text"></span>
      </div>
      <div className="ss-stat-item ss-stat-skeleton">
        <span className="ss-stat-label">APY</span>
        <span className="ss-stat-value ss-skeleton-text"></span>
      </div>
      <div className="ss-stat-item ss-stat-skeleton">
        <span className="ss-stat-label">Next DCA</span>
        <span className="ss-stat-value ss-skeleton-text"></span>
      </div>
      <div className="ss-stat-item ss-goal-item ss-stat-skeleton">
        <span className="ss-stat-label">Savings Goal</span>
        <div className="ss-goal-bar ss-skeleton-bar">
          <div className="ss-goal-progress" />
        </div>
      </div>
    </div>
  </div>
);

// Error Card component for more consistent error handling
const ErrorCard = ({ title, message, retryAction }: { title: string; message: string; retryAction?: () => void }) => (
  <div className="ss-error-card">
    <div className="ss-error-icon">❌</div>
    <h3 className="ss-error-title">{title}</h3>
    <p className="ss-error-message">{message}</p>
    {retryAction && (
      <button className="ss-retry-button" onClick={retryAction}>
        Try Again
      </button>
    )}
  </div>
);

// Savings Stats Component
const SavingsStats = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { address, isConnected } = useAccount();
  
  // Get savings status from contract
  const { data: savingsStatus, isLoading, isError, refetch } = useReadContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'getDailySavingsStatus',
    args: [address as `0x${string}`, DEFAULT_TOKEN as `0x${string}`],
  }) as { data: SavingsStatus | undefined, isLoading: boolean, isError: boolean, refetch: () => void };
  
  // Get execution status for timing
  const { data: executionStatus } = useReadContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'getDailyExecutionStatus',
    args: [address as `0x${string}`, DEFAULT_TOKEN as `0x${string}`],
  }) as { data: ExecutionStatus | undefined };

  // Format currency (ETH/USDC) to display amount
  const formatCurrency = (value: bigint | undefined): string => {
    if (!value) return "0.00";
    // Convert from wei to ETH (assuming 18 decimals)
    return (Number(value) / 1e18).toFixed(2);
  };

  // Calculate days until next DCA
  const daysUntilNextDCA = (): string => {
    if (!executionStatus || !executionStatus.nextExecutionTime) return "N/A";
    
    const now = Math.floor(Date.now() / 1000);
    const secondsRemaining = Number(executionStatus.nextExecutionTime) - now;
    
    if (secondsRemaining <= 0) return "Now";
    
    const days = Math.floor(secondsRemaining / (60 * 60 * 24));
    const hours = Math.floor((secondsRemaining % (60 * 60 * 24)) / (60 * 60));
    
    if (days > 0) return `${days}d ${hours}h`;
    return `${hours}h`;
  };

  // Calculate goal progress percentage
  const calculateGoalProgress = (): number => {
    if (!savingsStatus || !savingsStatus.goalAmount || Number(savingsStatus.goalAmount) === 0) {
      return 0;
    }
    
    return Math.min(
      Math.floor((Number(savingsStatus.currentAmount) / Number(savingsStatus.goalAmount)) * 100), 
      100
    );
  };

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const renderContent = () => {
    if (!isConnected || !address) {
      return (
        <div className="ss-connect-wallet-message">
          <div className="ss-connect-wallet-icon">🔐</div>
          <p>Connect your wallet to view savings</p>
        </div>
      );
    }

    if (isLoading) {
      return (
        <div className="ss-loading-container">
          <div className="ss-loading-spinner"></div>
          <span>Loading savings data...</span>
        </div>
      );
    }

    if (isError) {
      return (
        <ErrorCard 
          title="Data Error" 
          message="Could not load savings data. Please try again later."
          retryAction={refetch}
        />
      );
    }

    const progress = calculateGoalProgress();

    return (
      <div className="ss-stats-grid">
        <div className="ss-stat-item">
          <span className="ss-stat-label">Total Saved</span>
          <span className="ss-stat-value">
            ${formatCurrency(savingsStatus?.currentAmount)}
          </span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-label">APY</span>
          <span className="ss-stat-value">3.2%</span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-label">Next DCA</span>
          <span className="ss-stat-value">{daysUntilNextDCA()}</span>
        </div>
        <div className="ss-stat-item ss-goal-item">
          <span className="ss-stat-label">Savings Goal</span>
          <div className="ss-goal-bar">
            <div 
              className="ss-goal-progress" 
              style={{ width: `${progress}%` }}
            />
            <span className="ss-goal-percentage">{progress}%</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="ss-stats-wrapper">
      <button className="ss-section-button" onClick={handleClick}>
        <div className="ss-stats-header">
          <span className="ss-stats-icon">📊</span>
          <h3>Your Savings Stats</h3>
          <span className="ss-expand-icon">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {isExpanded && renderContent()}
    </div>
  );
};

// Transactions component for deposits, withdrawals and DCA
const TransactionActions = () => {
  const [isExpanded, setIsExpanded] = useState(false);
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [savingsOption, setSavingsOption] = useState<'deposit' | 'withdraw' | 'dca' | null>(null);
  
  // For transaction simulation
  const [simulationStatus, setSimulationStatus] = useState<'idle' | 'simulating' | 'success' | 'error'>('idle');
  const [simulationErrors, setSimulationErrors] = useState<{message: string; details: string} | null>(null);
  const [simulationResults, setSimulationResults] = useState<{
    success: boolean;
    gasCost: string;
    estimatedNetworkFee: string;
    estimatedPriorityFee: string;
    estimatedTime: string;
    optimizationSuggestions: string[];
  } | null>(null);

  // Use writeContract instead of writeAsync
  const { writeContract: depositWrite } = useWriteContract();
  const { writeContract: withdrawWrite } = useWriteContract();
  const { writeContract: dcaWrite } = useWriteContract();

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  // Simulate transaction for preview
  const simulateTransaction = async (transactionParams: {
    type: string;
    amount?: string;
    contractAddress: `0x${string}`;
    functionName: string;
    args: any[];
  }) => {
    setSimulationStatus('simulating');
    setSimulationErrors(null);
    setSimulationResults(null);
    
    try {
      // In production, you would call a simulation API or use a provider to estimate gas
      // For demo purposes, we're simulating the response
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // This is a mock response - in production, you would get this from chain interaction
      const simulationResponse = {
        success: true,
        gasCost: "0.0021 ETH",
        estimatedNetworkFee: "0.0015 ETH",
        estimatedPriorityFee: "0.0006 ETH",
        estimatedTime: "15 seconds",
        optimizationSuggestions: [
          "Consider batching multiple transactions to save on gas",
          "Gas prices are higher than usual, consider waiting for lower network activity"
        ]
      };
      
      // Update with the simulation results
      setSimulationResults(simulationResponse);
      setSimulationStatus('success');
      
      // Show a toast with the simulation results
      toast.success(`Transaction simulation complete: Estimated gas ${simulationResponse.gasCost}`);
      
    } catch (error) {
      setSimulationStatus('error');
      setSimulationErrors({
        message: "Failed to simulate transaction. Please try again.",
        details: error instanceof Error ? error.message : String(error)
      });
      
      toast.error("Transaction simulation failed");
    }
  };

  const handleDeposit = async () => {
    if (!address || !amount) return;
    
    // Set the current operation
    setSavingsOption('deposit');
    
    try {
      if (simulationStatus !== 'success') {
        // First simulate the transaction
        await simulateTransaction({
          type: 'deposit',
          amount,
          contractAddress: DAILY_SAVINGS_CONTRACT as `0x${string}`,
          functionName: 'deposit',
          args: [DEFAULT_TOKEN as `0x${string}`, parseEther(amount)]
        });
        return;
      }
      
      // If simulation was successful, proceed with the actual transaction
      const parsedAmount = parseEther(amount);
      
      await depositWrite({
        address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
        abi: DailySavingsABI,
        functionName: 'deposit',
        args: [DEFAULT_TOKEN as `0x${string}`, parsedAmount],
      });
      
      toast.success('Deposit successful!');
      setAmount('');
      setSimulationStatus('idle');
      setSimulationResults(null);
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Deposit failed. Please try again.');
    } finally {
      setSavingsOption(null);
    }
  };

  const handleWithdraw = async () => {
    if (!address || !amount) return;
    
    // Set the current operation
    setSavingsOption('withdraw');
    
    try {
      if (simulationStatus !== 'success') {
        // First simulate the transaction
        await simulateTransaction({
          type: 'withdraw',
          amount,
          contractAddress: DAILY_SAVINGS_CONTRACT as `0x${string}`,
          functionName: 'withdraw',
          args: [DEFAULT_TOKEN as `0x${string}`, parseEther(amount)]
        });
        return;
      }
      
      // If simulation was successful, proceed with the actual transaction
      const parsedAmount = parseEther(amount);
      
      await withdrawWrite({
        address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
        abi: DailySavingsABI,
        functionName: 'withdraw',
        args: [DEFAULT_TOKEN as `0x${string}`, parsedAmount],
      });
      
      toast.success('Withdrawal successful!');
      setAmount('');
      setSimulationStatus('idle');
      setSimulationResults(null);
    } catch (error) {
      console.error('Withdrawal error:', error);
      toast.error('Withdrawal failed. Please try again.');
    } finally {
      setSavingsOption(null);
    }
  };

  const handleDCA = async () => {
    if (!address) return;
    
    // Set the current operation
    setSavingsOption('dca');
    
    try {
      if (simulationStatus !== 'success') {
        // First simulate the transaction
        await simulateTransaction({
          type: 'dca',
          contractAddress: DAILY_SAVINGS_CONTRACT as `0x${string}`,
          functionName: 'executeDCA',
          args: [DEFAULT_TOKEN as `0x${string}`]
        });
        return;
      }
      
      // If simulation was successful, proceed with the actual transaction
      await dcaWrite({
        address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
        abi: DailySavingsABI,
        functionName: 'executeDCA',
        args: [DEFAULT_TOKEN as `0x${string}`],
      });
      
      toast.success('DCA execution successful!');
      setSimulationStatus('idle');
      setSimulationResults(null);
    } catch (error) {
      console.error('DCA error:', error);
      toast.error('DCA execution failed. Please try again.');
    } finally {
      setSavingsOption(null);
    }
  };

  const resetSimulation = () => {
    setSimulationStatus('idle');
    setSimulationResults(null);
    setSimulationErrors(null);
  };

  const renderContent = () => {
    return (
      <>
        {simulationStatus === 'success' && simulationResults && (
          <div className="ss-simulation-card">
            <div className="ss-simulation-header">
              <h4>Transaction Preview</h4>
              <button 
                className="ss-close-preview" 
                onClick={resetSimulation}
                aria-label="Close preview"
              >×</button>
            </div>
            <div className="ss-simulation-details">
              <div className="ss-simulation-detail">
                <span className="ss-detail-label">Estimated gas:</span>
                <span className="ss-detail-value">{simulationResults.gasCost}</span>
              </div>
              <div className="ss-simulation-detail">
                <span className="ss-detail-label">Network fee:</span>
                <span className="ss-detail-value">{simulationResults.estimatedNetworkFee}</span>
              </div>
              <div className="ss-simulation-detail">
                <span className="ss-detail-label">Estimated time:</span>
                <span className="ss-detail-value">{simulationResults.estimatedTime}</span>
              </div>
            </div>
            
            <div className="ss-optimization-tips">
              <h5>Optimization Tips</h5>
              <ul>
                {simulationResults.optimizationSuggestions.map((tip, index) => (
                  <li key={index}>{tip}</li>
                ))}
              </ul>
            </div>
            
            <div className="ss-confirm-action">
              <button 
                className={`ss-confirm-button ${savingsOption || ''}`}
                onClick={() => {
                  if (savingsOption === 'deposit') handleDeposit();
                  else if (savingsOption === 'withdraw') handleWithdraw();
                  else if (savingsOption === 'dca') handleDCA();
                }}
                disabled={!savingsOption || simulationStatus !== 'success'}
              >
                Confirm Transaction
              </button>
            </div>
          </div>
        )}
        
        {simulationStatus === 'error' && simulationErrors && (
          <ErrorCard
            title="Simulation Error"
            message={simulationErrors.message}
            retryAction={resetSimulation}
          />
        )}
        
        <div className="ss-amount-input-container">
          <div className="ss-input-label">Amount</div>
          <div className="ss-amount-input">
            <span className="ss-currency-symbol">$</span>
            <input
              type="text"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              className="ss-input"
              disabled={simulationStatus === 'simulating'}
            />
          </div>
        </div>
        
        <div className="ss-actions-grid">
          <button 
            className={`ss-action-button ss-deposit${savingsOption === 'deposit' && simulationStatus === 'simulating' ? ' ss-loading' : ''}`}
            onClick={handleDeposit}
            disabled={!address || !amount || simulationStatus === 'simulating' || (savingsOption !== null && savingsOption !== 'deposit')}
          >
            <span className="ss-action-icon">💰</span>
            <span className="ss-action-label">
              {savingsOption === 'deposit' && simulationStatus === 'simulating' ? 'Simulating...' : 'Deposit'}
            </span>
          </button>
          <button 
            className={`ss-action-button ss-withdraw${savingsOption === 'withdraw' && simulationStatus === 'simulating' ? ' ss-loading' : ''}`}
            onClick={handleWithdraw}
            disabled={!address || !amount || simulationStatus === 'simulating' || (savingsOption !== null && savingsOption !== 'withdraw')}
          >
            <span className="ss-action-icon">💸</span>
            <span className="ss-action-label">
              {savingsOption === 'withdraw' && simulationStatus === 'simulating' ? 'Simulating...' : 'Withdraw'}
            </span>
          </button>
          <button 
            className={`ss-action-button ss-dca${savingsOption === 'dca' && simulationStatus === 'simulating' ? ' ss-loading' : ''}`}
            onClick={handleDCA}
            disabled={!address || simulationStatus === 'simulating' || (savingsOption !== null && savingsOption !== 'dca')}
          >
            <span className="ss-action-icon">📈</span>
            <span className="ss-action-label">
              {savingsOption === 'dca' && simulationStatus === 'simulating' ? 'Simulating...' : 'DCA'}
            </span>
          </button>
          <button 
            className="ss-action-button ss-rewards"
            disabled={!address}
          >
            <span className="ss-action-icon">🎁</span>
            <span className="ss-action-label">Rewards</span>
          </button>
        </div>
      </>
    );
  };

  return (
    <div className="ss-transaction-actions">
      <button className="ss-section-button" onClick={handleClick}>
        <div className="ss-actions-header">
          <span className="ss-actions-icon">💸</span>
          <h3 className="ss-actions-title">Quick Actions</h3>
          <span className="ss-expand-icon">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {isExpanded && renderContent()}
    </div>
  );
};

// Notification badge for the wallet icon
const NotificationBadge = ({ count }: { count: number }) => {
  if (count === 0) return null;
  
  return (
    <div className="ss-notification-badge">
      {count > 9 ? '9+' : count}
    </div>
  );
};

// Main Wallet Component
export default function SpendSaveWallet() {
  const { address, isConnected } = useAccount();
  const [notificationCount, setNotificationCount] = useState(0);
  
  // Check for pending daily savings (notifications)
  const { data: hasPendingSavings, isSuccess } = useReadContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'hasPendingDailySavings',
    args: [address],
  });

  // Update notification count when data changes
  useEffect(() => {
    if (isSuccess && hasPendingSavings === true) {
      setNotificationCount(prev => Math.min(prev + 1, 9));
    }
  }, [hasPendingSavings, isSuccess]);
  
  return (
    <div className="spendsave-wallet-container">
      <Wallet>
        <ConnectWallet 
          className="ss-connect-button" 
          disconnectedLabel="Connect Wallet"
        >
          <div className="ss-wallet-connected">
            <div className="ss-avatar-container">
              <Avatar className="ss-avatar" />
              <NotificationBadge count={notificationCount} />
            </div>
            <div className="ss-connected-info">
              <Name className="ss-name" />
              <EthBalance className="ss-balance" />
            </div>
          </div>
        </ConnectWallet>
        
        <WalletDropdown className="ss-wallet-dropdown">
          {/* Custom Header - Fixed at the top */}
          <Identity
            className="ss-wallet-header"
            hasCopyAddressOnClick
          >
            <div className="ss-identity-content">
              <Avatar className="ss-avatar-large" />
              <div className="ss-identity-info">
                <Name className="ss-name-large" />
                <Address className="ss-address" />
                <div className="ss-balance-container">
                  <EthBalance className="ss-balance-large" />
                  <span className="ss-balance-label">Available</span>
                </div>
              </div>
            </div>
          </Identity>
          
          {/* Scrollable Content Container */}
          <div className="ss-wallet-scrollable-content">
            {/* Custom Stats Section - Wrapped in error boundary */}
            <ErrorBoundary fallback={<StatsFallback />}>
              <Suspense fallback={<LoadingFallback />}>
                <SavingsStats />
              </Suspense>
            </ErrorBoundary>
            
            {/* Transaction Actions - Wrapped in error boundary */}
            <ErrorBoundary fallback={
              <div className="ss-transaction-actions">
                <div className="ss-actions-header">
                  <span className="ss-actions-icon">💸</span>
                  <h3 className="ss-actions-title">Quick Actions</h3>
                </div>
                <ErrorCard
                  title="Actions Unavailable"
                  message="Transaction actions could not be loaded. Please try again later."
                />
              </div>
            }>
              <TransactionActions />
            </ErrorBoundary>
            
            {/* Standard Links */}
            <div className="ss-wallet-links">
              <WalletDropdownBasename className="ss-dropdown-link" />
              
              <WalletDropdownLink
                className="ss-dropdown-link"
                icon="plus"
                href="/dashboard"
              >
                Savings Dashboard
              </WalletDropdownLink>
              
              <WalletDropdownLink
                className="ss-dropdown-link"
                icon="gear"
                href="/settings"
              >
                Savings Strategy
              </WalletDropdownLink>
              
              <WalletDropdownLink
                className="ss-dropdown-link"
                icon="chart"
                href="/analytics"
              >
                Performance Analytics
              </WalletDropdownLink>
              
              <WalletDropdownDisconnect className="ss-disconnect-button" />
            </div>
          </div>
        </WalletDropdown>
      </Wallet>
    </div>
  );
} 