'use client';

import React, { useState } from 'react';
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
import './spendsave-wallet.css';

// Custom savings stat component for the wallet dropdown
const SavingsStats = () => {
  // This would be connected to your actual protocol state in production
  const mockStats = {
    totalSaved: "1,245.32",
    savingsRate: "3.2%",
    nextDCA: "2d 4h",
    savingsGoal: 68, // percentage
  };

  return (
    <div className="ss-wallet-stats">
      <div className="ss-stats-header">
        <span className="ss-stats-icon">📊</span>
        <h3>Your Savings Stats</h3>
      </div>
      
      <div className="ss-stats-grid">
        <div className="ss-stat-item">
          <span className="ss-stat-label">Total Saved</span>
          <span className="ss-stat-value">${mockStats.totalSaved}</span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-label">APY</span>
          <span className="ss-stat-value">{mockStats.savingsRate}</span>
        </div>
        <div className="ss-stat-item">
          <span className="ss-stat-label">Next DCA</span>
          <span className="ss-stat-value">{mockStats.nextDCA}</span>
        </div>
        <div className="ss-stat-item ss-goal-item">
          <span className="ss-stat-label">Savings Goal</span>
          <div className="ss-goal-bar">
            <div 
              className="ss-goal-progress" 
              style={{ width: `${mockStats.savingsGoal}%` }}
            />
            <span className="ss-goal-percentage">{mockStats.savingsGoal}%</span>
          </div>
        </div>
      </div>
    </div>
  );
};

// Custom quick actions component for the wallet dropdown
const QuickActions = () => {
  return (
    <div className="ss-quick-actions">
      <h3 className="ss-actions-title">Quick Actions</h3>
      <div className="ss-actions-grid">
        <button className="ss-action-button ss-deposit">
          <span className="ss-action-icon">💰</span>
          <span className="ss-action-label">Deposit</span>
        </button>
        <button className="ss-action-button ss-withdraw">
          <span className="ss-action-icon">💸</span>
          <span className="ss-action-label">Withdraw</span>
        </button>
        <button className="ss-action-button ss-dca">
          <span className="ss-action-icon">📈</span>
          <span className="ss-action-label">DCA</span>
        </button>
        <button className="ss-action-button ss-rewards">
          <span className="ss-action-icon">🎁</span>
          <span className="ss-action-label">Rewards</span>
        </button>
      </div>
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

export default function SpendSaveWallet() {
  const [notificationCount, setNotificationCount] = useState(3);
  
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
            {/* Custom Stats Section */}
            <SavingsStats />
            
            {/* Quick Actions */}
            <QuickActions />
            
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