'use client';

import React, { useState } from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownDisconnect,
} from '@coinbase/onchainkit/wallet';
import {
  Avatar,
  Name,
  Identity,
} from '@coinbase/onchainkit/identity';
import { useAccount } from 'wagmi';
import { formatUnits } from 'viem';
import { toast } from 'react-hot-toast';
import { 
  FiCopy, 
  FiCheck, 
  FiPieChart, 
  FiPlus,
  FiMinus,
  FiArrowRight,
  FiArrowUpRight,
  FiCreditCard,
  FiUser
} from 'react-icons/fi';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import './spendsave-wallet.css';

// Address display with copy function
const AddressDisplay = ({ address }: { address: `0x${string}` | undefined }) => {
  const [copied, setCopied] = useState(false);
  
  if (!address) return null;
  
  const formattedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  
  return (
    <div className="wallet-address">
      <span>{formattedAddress}</span>
      <button 
        className="copy-button" 
        onClick={copyAddress}
        aria-label="Copy address"
      >
        {copied ? <FiCheck /> : <FiCopy />}
      </button>
    </div>
  );
};

// Token Display Component
const TokenDisplay = ({ symbol, name, balance, icon }: { 
  symbol: string;
  name: string;
  balance: string;
  icon: React.ReactNode;
}) => {
  return (
    <div className="token-item">
      <div className="token-icon">
        {icon}
      </div>
      <div className="token-details">
        <div className="token-name">{name}</div>
        <div className="token-balance">
          <span className="balance-amount">{parseFloat(balance).toFixed(4)}</span>
          <span className="balance-symbol">{symbol}</span>
        </div>
      </div>
    </div>
  );
};

// Quick Action Button Component
const ActionButton = ({ 
  label, 
  icon, 
  onClick, 
  variant = 'primary' 
}: { 
  label: string;
  icon: React.ReactNode;
  onClick: () => void;
  variant?: 'primary' | 'secondary' | 'tertiary';
}) => {
  return (
    <button 
      className={`quick-action-button ${variant}`}
      onClick={onClick}
    >
      {icon}
      <span>{label}</span>
    </button>
  );
};

// Main SpendSaveWallet Component
export default function SpendSaveWallet() {
  const { address, isConnected } = useAccount();
  const { tokenBalances } = useTokenBalances();
  const ethBalance = tokenBalances?.ETH?.formattedBalance || '0.00';
  const usdcBalance = tokenBalances?.USDC?.formattedBalance || '0.00';
  
  const handleDeposit = () => {
    toast.success('Deposit feature coming soon');
  };
  
  const handleWithdraw = () => {
    toast.success('Withdraw feature coming soon');
  };
  
  const handleSwap = () => {
    toast.success('Swap feature coming soon');
  };
  
  const handleBuy = () => {
    toast.success('Buy crypto feature coming soon');
  };

  return (
    <div className="wallet-container">
      <Wallet>
        {!isConnected ? (
          <ConnectWallet className="connect-wallet-button">
            + Connect Wallet
          </ConnectWallet>
        ) : (
          <div className="wallet-connected-display">
            <div className="wallet-balance">
              <span>{ethBalance} ETH</span>
            </div>
            {address && (
              <Identity address={address}>
                <Avatar className="wallet-avatar" />
              </Identity>
            )}
          </div>
        )}
        
        <WalletDropdown className="wallet-dropdown">
          {/* Wallet Header Section */}
          <div className="wallet-header">
            {address && (
              <div className="wallet-identity">
                <Identity address={address}>
                  <Avatar className="wallet-avatar-large" />
                </Identity>
                <div className="wallet-info">
                  <Identity address={address}>
                    <Name className="wallet-name" />
                  </Identity>
                  <AddressDisplay address={address} />
                </div>
              </div>
            )}
            
            {/* Main Balance Display */}
            <div className="wallet-main-balance">
              <FiUser className="balance-icon" />
              <div className="balance-info">
                <div className="balance-label">Total Balance</div>
                <div className="balance-value">{ethBalance} ETH</div>
              </div>
            </div>
          </div>
          
          {/* Quick Actions Section */}
          <div className="wallet-actions">
            <div className="action-group">
              <ActionButton 
                label="Deposit" 
                icon={<FiPlus />} 
                onClick={handleDeposit}
                variant="primary"
              />
              <ActionButton 
                label="Withdraw" 
                icon={<FiMinus />} 
                onClick={handleWithdraw}
                variant="secondary"
              />
              <ActionButton 
                label="Swap" 
                icon={<FiArrowRight />} 
                onClick={handleSwap}
                variant="tertiary"
              />
              <ActionButton 
                label="Buy" 
                icon={<FiCreditCard />} 
                onClick={handleBuy}
                variant="secondary"
              />
            </div>
          </div>
          
          {/* Token Balances Section */}
          <div className="wallet-tokens">
            <h3 className="section-title">Your Assets</h3>
            <div className="token-list">
              <TokenDisplay 
                symbol="ETH" 
                name="Ethereum" 
                balance={ethBalance}
                icon={<span className="token-symbol">Ξ</span>}
              />
              
              <TokenDisplay 
                symbol="USDC" 
                name="USD Coin" 
                balance={usdcBalance}
                icon={<span className="token-symbol">$</span>}
              />
            </div>
          </div>
          
          {/* Portfolio Section */}
          <div className="wallet-portfolio">
            <div className="portfolio-header">
              <h3 className="section-title">Portfolio</h3>
              <a href="/dashboard" className="view-all">
                View all <FiArrowUpRight />
              </a>
            </div>
            
            <div className="portfolio-stats">
              <div className="stat">
                <FiPieChart className="stat-icon" />
                <div className="stat-details">
                  <div className="stat-label">Total Savings</div>
                  <div className="stat-value">$142.50</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Disconnect Button */}
          <div className="wallet-footer">
            <WalletDropdownDisconnect className="disconnect-button" />
          </div>
        </WalletDropdown>
      </Wallet>
    </div>
  );
} 