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
  useWaitForTransactionReceipt,
  useSimulateContract
} from 'wagmi';
import DailySavingsABI from '../ABI/DailySavings.json';
import SavingABI from '../ABI/Saving.json';
import TokenABI from '../ABI/Token.json';
import SlippageControlABI from '../ABI/SlippageControl.json';
import './spendsave-wallet.css';
import { formatUnits, parseUnits } from 'viem';
import { toast } from 'react-hot-toast';
import { FiArrowRight, FiCopy, FiCheck, FiPieChart, FiBarChart2, FiDollarSign, FiSettings, FiTrendingUp, FiGift } from 'react-icons/fi';
import useWalletInteractions from '@/lib/hooks/useWalletInteractions';

// Contract addresses - replace with actual contract addresses
const DAILY_SAVINGS_CONTRACT = "0x4B5DF730c2e6b28E17013A1485E5d9BC41Efe021";
const SAVINGS_CONTRACT = "0x2b7EB565019abb6b8e48a34A57A6939F257E6017";
const TOKEN_CONTRACT = "0xd9145CCE52D386f254917e481eB44e9943F39138";
const DEFAULT_TOKEN = "0xd9145CCE52D386f254917e481eB44e9943F39138"; // Default to TOKEN_CONTRACT

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
      <FiPieChart className="ss-stats-icon" />
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
  const [isExpanded, setIsExpanded] = useState(true);
  const { address, isConnected } = useAccount();
  const [retryCount, setRetryCount] = useState(0);
  
  // Get savings status from contract with better error handling
  const { data: savingsStatus, isLoading, isError, refetch } = useReadContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'getDailySavingsStatus',
    args: address ? [address as `0x${string}`, DEFAULT_TOKEN as `0x${string}`] : undefined,
    query: {
      retry: 2,
      retryDelay: 1000,
      gcTime: 0
    }
  }) as { data: SavingsStatus | undefined, isLoading: boolean, isError: boolean, refetch: () => void };
  
  // Get execution status for timing with better error handling
  const { data: executionStatus } = useReadContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'getDailyExecutionStatus',
    args: address ? [address as `0x${string}`, DEFAULT_TOKEN as `0x${string}`] : undefined,
    query: {
      retry: 2,
      retryDelay: 1000,
      gcTime: 0
    }
  }) as { data: ExecutionStatus | undefined };

  // Handle retry
  const handleRetry = () => {
    setRetryCount(prev => prev + 1);
    refetch();
  };

  // Format currency (ETH/USDC) to display amount
  const formatCurrency = (value: bigint | undefined): string => {
    if (!value) return "0.00";
    // Convert from wei to ETH (assuming 18 decimals)
    return formatUnits(value, 18);
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
        <div className="ss-error-container">
          <div className="ss-error-icon">❌</div>
          <h3 className="ss-error-title">Data Error</h3>
          <p className="ss-error-message">
            Could not load savings data. This could be due to network issues or invalid contract addresses.
            Please check your connection and try again.
          </p>
          <button 
            className="ss-retry-button" 
            onClick={handleRetry}
          >
            Try Again
          </button>
        </div>
      );
    }

    const progress = calculateGoalProgress();

    return (
      <div className="ss-stats-grid">
        <div className="ss-stat-item">
          <span className="ss-stat-label">Total Saved</span>
          <span className="ss-stat-value">
            <FiDollarSign className="ss-stat-icon-small" />
            {formatCurrency(savingsStatus?.currentAmount)}
          </span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-label">APY</span>
          <span className="ss-stat-value">
            <FiTrendingUp className="ss-stat-icon-small" />
            3.2%
          </span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-label">Next DCA</span>
          <span className="ss-stat-value">
            <FiBarChart2 className="ss-stat-icon-small" />
            {daysUntilNextDCA()}
          </span>
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
          <FiPieChart className="ss-stats-icon" />
          <h3>Your Savings Stats</h3>
          <span className="ss-expand-icon">{isExpanded ? '▲' : '▼'}</span>
        </div>
      </button>
      {isExpanded && (
        <div className="ss-stats-content">
          {renderContent()}
        </div>
      )}
    </div>
  );
};

// User Address with Copy Function
const UserAddressDisplay = ({ address }: { address: `0x${string}` | undefined }) => {
  const { formattedAddress, copied, copyAddress } = useWalletInteractions();

  if (!address) return null;

  return (
    <div className="ss-address-display">
      <span className="ss-address-text">{formattedAddress}</span>
      <button 
        className="ss-copy-button" 
        onClick={copyAddress} 
        title={copied ? "Copied!" : "Copy address"}
      >
        {copied ? <FiCheck className="ss-icon-success" /> : <FiCopy />}
      </button>
    </div>
  );
};

// Transactions component for deposits, withdrawals and DCA
const TransactionActions = () => {
  const [isExpanded, setIsExpanded] = useState(true);
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [activeOperation, setActiveOperation] = useState<'deposit' | 'withdraw' | 'dca' | null>(null);
  const [inputError, setInputError] = useState<string | null>(null);
  
  // Use our custom wallet interactions hook - only get what we need
  const { 
    setTransactionHash, 
    isPending: txIsPending,
    isSuccess: txIsSuccess
  } = useWalletInteractions();
  
  // Use Wagmi hooks for contract interactions
  const { writeContract, isPending: isWritePending } = useWriteContract();
  
  // Reset input error when amount changes
  useEffect(() => {
    setInputError(null);
  }, [amount]);

  // Reset action when transaction succeeds
  useEffect(() => {
    if (txIsSuccess) {
      setActiveOperation(null);
    }
  }, [txIsSuccess]);

  // Validate amount format
  const validateAmount = (value: string): boolean => {
    // Allow empty string (for clearing input)
    if (value === '') return true;
    
    // Check if it's a valid number with at most 6 decimal places
    const regex = /^\d+(\.\d{0,6})?$/;
    return regex.test(value);
  };

  // Handle amount change with validation
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (validateAmount(value)) {
      setAmount(value);
    }
  };

  // Deposit simulation
  const { data: depositSimData, isError: isDepositSimError } = useSimulateContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'deposit',
    args: amount ? [DEFAULT_TOKEN as `0x${string}`, parseUnits(amount, 18)] : undefined,
    query: {
      enabled: !!amount && activeOperation === 'deposit'
    }
  });

  // Withdraw simulation
  const { data: withdrawSimData, isError: isWithdrawSimError } = useSimulateContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'withdraw',
    args: amount ? [DEFAULT_TOKEN as `0x${string}`, parseUnits(amount, 18)] : undefined,
    query: {
      enabled: !!amount && activeOperation === 'withdraw'
    }
  });

  // DCA simulation
  const { data: dcaSimData, isError: isDcaSimError } = useSimulateContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'executeDCA',
    args: [DEFAULT_TOKEN as `0x${string}`],
    query: {
      enabled: activeOperation === 'dca'
    }
  });

  const handleClick = () => {
    setIsExpanded(!isExpanded);
  };

  const handleDeposit = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setInputError('Please enter a valid amount');
      return;
    }
    
    setActiveOperation('deposit');
    
    try {
      // Use the deposit simulation data from above
      if (depositSimData) {
        const hash = await writeContract(depositSimData.request);
        setTransactionHash(hash);
        toast.success('Deposit transaction submitted');
        setAmount('');
      } else {
        toast.error('Please enter a valid amount');
        setActiveOperation(null);
      }
    } catch (error) {
      console.error('Deposit error:', error);
      toast.error('Deposit failed. Please try again.');
      setActiveOperation(null);
    }
  };

  const handleWithdraw = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
      setInputError('Please enter a valid amount');
      return;
    }
    
    setActiveOperation('withdraw');
    
    try {
      if (withdrawSimData) {
        const hash = await writeContract(withdrawSimData.request);
        setTransactionHash(hash);
        toast.success('Withdraw transaction submitted');
        setAmount('');
      } else {
        toast.error('Please enter a valid amount');
        setActiveOperation(null);
      }
    } catch (error) {
      console.error('Withdraw error:', error);
      toast.error('Withdraw failed. Please try again.');
      setActiveOperation(null);
    }
  };

  const handleDCA = async () => {
    if (!address) {
      toast.error('Please connect your wallet');
      return;
    }
    
    setActiveOperation('dca');
    
    try {
      if (dcaSimData) {
        const hash = await writeContract(dcaSimData.request);
        setTransactionHash(hash);
        toast.success('DCA transaction submitted');
      } else {
        toast.error('DCA simulation failed. Please try again later.');
        setActiveOperation(null);
      }
    } catch (error) {
      console.error('DCA error:', error);
      toast.error('DCA execution failed. Please try again.');
      setActiveOperation(null);
    }
  };

  const isLoading = isWritePending || txIsPending;

  const renderContent = () => {
    return (
      <>
        <div className="ss-amount-input-container">
          <div className="ss-input-label">Amount {inputError && <span className="ss-input-error">({inputError})</span>}</div>
          <div className={`ss-amount-input ${inputError ? 'ss-input-error-border' : ''}`}>
            <span className="ss-currency-symbol">$</span>
            <input
              type="text"
              value={amount}
              onChange={handleAmountChange}
              placeholder="0.00"
              className="ss-input"
              disabled={isLoading}
            />
          </div>
        </div>
        
        <div className="ss-actions-grid">
          <button 
            className={`ss-action-button ss-deposit ${activeOperation === 'deposit' && isLoading ? 'ss-loading' : ''}`}
            onClick={handleDeposit}
            disabled={!address || isLoading}
          >
            <FiDollarSign className="ss-action-icon" />
            <span className="ss-action-label">
              {activeOperation === 'deposit' && isLoading ? 'Processing...' : 'Deposit'}
            </span>
          </button>
          <button 
            className={`ss-action-button ss-withdraw ${activeOperation === 'withdraw' && isLoading ? 'ss-loading' : ''}`}
            onClick={handleWithdraw}
            disabled={!address || isLoading}
          >
            <FiArrowRight className="ss-action-icon" />
            <span className="ss-action-label">
              {activeOperation === 'withdraw' && isLoading ? 'Processing...' : 'Withdraw'}
            </span>
          </button>
          <button 
            className={`ss-action-button ss-dca ${activeOperation === 'dca' && isLoading ? 'ss-loading' : ''}`}
            onClick={handleDCA}
            disabled={!address || isLoading}
          >
            <FiBarChart2 className="ss-action-icon" />
            <span className="ss-action-label">
              {activeOperation === 'dca' && isLoading ? 'Processing...' : 'DCA'}
            </span>
          </button>
          <button 
            className="ss-action-button ss-rewards"
            disabled={!address || isLoading}
          >
            <FiGift className="ss-action-icon" />
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
          <FiSettings className="ss-actions-icon" />
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

// Add styles to fix Identity rendering issues
const IdentityContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="ss-identity-container" style={{ minHeight: '24px' }}>
      {children}
    </div>
  );
};

// Update the SafeIdentity component to include necessary styling
const SafeIdentity = ({ address, children }: { address: `0x${string}` | undefined, children: React.ReactNode }) => {
  if (!address) return null;
  
  return (
    <IdentityContainer>
      <Identity address={address}>
        {children}
      </Identity>
    </IdentityContainer>
  );
};

// Main Wallet Component - Update to improve nav integration
export default function SpendSaveWallet() {
  const { address, isConnected } = useAccount();
  const [notificationCount, setNotificationCount] = useState(0);
  const walletInteractions = useWalletInteractions();
  
  // Check for pending daily savings (notifications)
  const { data: hasPendingSavings, isSuccess } = useReadContract({
    address: DAILY_SAVINGS_CONTRACT as `0x${string}`,
    abi: DailySavingsABI,
    functionName: 'hasPendingDailySavings',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    }
  });

  // Update notification count when data changes
  useEffect(() => {
    if (isSuccess && hasPendingSavings === true) {
      setNotificationCount(prev => Math.min(prev + 1, 9));
    }
  }, [hasPendingSavings, isSuccess]);

  // Show pending indicator only when there's an actual pending transaction
  const txIsPending = walletInteractions.isPending && Boolean(walletInteractions.txReceipt);
  
  return (
    <div className="spendsave-wallet-container">
      <Wallet>
        <ConnectWallet 
          className="ss-connect-button" 
          disconnectedLabel="Connect"
          data-connected={isConnected ? "true" : "false"}
        >
          {isConnected ? (
            <div className="ss-wallet-connected">
              <div className="ss-avatar-container">
                {address && (
                  <SafeIdentity address={address}>
                    <Avatar className="ss-avatar" />
                  </SafeIdentity>
                )}
                {notificationCount > 0 && <NotificationBadge count={notificationCount} />}
              </div>
              <div className="ss-connected-info">
                {address && (
                  <SafeIdentity address={address}>
                    <Name className="ss-name" />
                  </SafeIdentity>
                )}
                <div className="ss-balance-text">
                  {address && !txIsPending && (
                    <SafeIdentity address={address}>
                      <EthBalance className="ss-balance" />
                    </SafeIdentity>
                  )}
                  {txIsPending && (
                    <span className="ss-pending-indicator">Processing...</span>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="ss-connect-button-content">
              <span className="ss-connect-icon">🔗</span>
              <span>Connect</span>
            </div>
          )}
        </ConnectWallet>
        
        <WalletDropdown className="ss-wallet-dropdown">
          {/* Custom Header - Fixed at the top */}
          <div className="ss-wallet-header">
            <div className="ss-wallet-header-content">
              {address && (
                <SafeIdentity address={address}>
                  <Avatar className="ss-avatar-large" />
                </SafeIdentity>
              )}
              <div className="ss-wallet-header-info">
                {address && (
                  <SafeIdentity address={address}>
                    <Name className="ss-name-large" />
                  </SafeIdentity>
                )}
                <UserAddressDisplay address={address} />
                <div className="ss-balance-container">
                  {address && (
                    <SafeIdentity address={address}>
                      <EthBalance className="ss-balance-large" />
                    </SafeIdentity>
                  )}
                </div>
              </div>
            </div>
          </div>
          
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
                  <FiSettings className="ss-actions-icon" />
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
            
            {/* Navigation Links */}
            <div className="ss-wallet-links">
              <h3 className="ss-links-title">SpendSave Menu</h3>
              
              <a 
                className="ss-dropdown-link" 
                href="/dashboard"
              >
                <FiPieChart className="ss-link-icon" />
                <span>Savings Dashboard</span>
              </a>
              
              <a
                className="ss-dropdown-link"
                href="/settings"
              >
                <FiSettings className="ss-link-icon" />
                <span>Savings Strategy</span>
              </a>
              
              <a
                className="ss-dropdown-link"
                href="/analytics"
              >
                <FiBarChart2 className="ss-link-icon" />
                <span>Performance Analytics</span>
              </a>
              
              <WalletDropdownBasename className="ss-dropdown-link ss-basename-link" />
              
              <WalletDropdownDisconnect className="ss-disconnect-button" />
            </div>
          </div>
        </WalletDropdown>
      </Wallet>
    </div>
  );
} 