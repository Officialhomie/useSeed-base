'use client';

import React, { useState } from 'react';
import {
  ConnectWallet,
  Wallet,
  WalletDropdown,
  WalletDropdownBasename,
  WalletDropdownDisconnect,
  WalletDropdownFundLink,
  WalletDropdownLink,
} from '@coinbase/onchainkit/wallet';
import {
  Avatar,
  Name,
  Identity,
  Address,
} from '@coinbase/onchainkit/identity';
import { useAccount, useConnect, useDisconnect } from 'wagmi';
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
  FiUser,
  FiChevronDown,
  FiUnlock,
  FiExternalLink
} from 'react-icons/fi';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';
import { 
  cbWalletConnector, 
  injectedConnector, 
  walletConnectConnector,
  genericInjectedConnector 
} from '../../../wagmi';
import './spendsave-wallet.css';

// Connector Selection Modal
const ConnectorModal = ({ 
  isOpen, 
  onClose, 
  onConnect 
}: {
  isOpen: boolean;
  onClose: () => void;
  onConnect: (connector: any) => void;
}) => {
  if (!isOpen) return null;

  const connectors = [
    {
      connector: cbWalletConnector,
      name: 'Coinbase Wallet',
      icon: '🔵',
      description: 'Connect with Coinbase Wallet'
    },
    {
      connector: injectedConnector,
      name: 'MetaMask',
      icon: '🦊',
      description: 'Connect with MetaMask'
    },
    {
      connector: walletConnectConnector,
      name: 'WalletConnect',
      icon: '🔗',
      description: 'Scan QR code with your wallet'
    },
    {
      connector: genericInjectedConnector,
      name: 'Browser Wallet',
      icon: '🌐',
      description: 'Connect with any browser wallet'
    }
  ];

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50" onClick={onClose}>
      <div className="bg-gray-900 rounded-xl p-6 max-w-md mx-4 border border-gray-800" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-bold text-white">Connect Wallet</h3>
          <button 
            onClick={onClose}
            className="text-gray-400 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>
        
        <div className="space-y-3">
          {connectors.map((item, index) => (
            <button
              key={index}
              onClick={() => {
                onConnect(item.connector);
                onClose();
              }}
              className="w-full p-4 bg-gray-800 hover:bg-gray-700 rounded-lg transition-colors flex items-center space-x-4"
            >
              <span className="text-2xl">{item.icon}</span>
              <div className="text-left">
                <div className="font-semibold text-white">{item.name}</div>
                <div className="text-sm text-gray-400">{item.description}</div>
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

// Address display with copy function
const AddressDisplay = ({ address }: { address: `0x${string}` | undefined }) => {
  const [copied, setCopied] = useState(false);
  
  if (!address) return null;
  
  const formattedAddress = `${address.substring(0, 6)}...${address.substring(address.length - 4)}`;
  
  const copyAddress = () => {
    navigator.clipboard.writeText(address);
    setCopied(true);
    toast.success('Address copied to clipboard!');
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
  const { address, isConnected, connector } = useAccount();
  const { connect } = useConnect();
  const { disconnect } = useDisconnect();
  const { tokenBalances } = useTokenBalances();
  const [showConnectorModal, setShowConnectorModal] = useState(false);
  
  const ethBalance = tokenBalances?.ETH?.formattedBalance || '0.00';
  const usdcBalance = tokenBalances?.USDC?.formattedBalance || '0.00';
  
  const handleConnect = (selectedConnector: any) => {
    try {
      connect({ connector: selectedConnector });
    } catch (error) {
      console.error('Connection error:', error);
      toast.error('Failed to connect wallet');
    }
  };
  
  const handleDisconnect = () => {
    disconnect();
    toast.success('Wallet disconnected');
  };
  
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
    <>
      <div className="wallet-container">
        <Wallet>
          <ConnectWallet 
            className="connect-wallet-button"
            text="Connect Wallet"
          />
          
          <WalletDropdown className="custom-wallet-dropdown">
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
                    <Identity address={address}>
                      <Address className="wallet-address-text" />
                    </Identity>
                    {connector && (
                      <div className="wallet-connector">
                        Connected via {connector.name}
                      </div>
                    )}
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

            {/* OnchainKit default options */}
            <WalletDropdownBasename />
            <WalletDropdownLink 
              icon="↗" 
              href="https://keys.coinbase.com" 
              rel="noopener noreferrer"
              target="_blank"
            >
              Wallet Settings
            </WalletDropdownLink>
            <WalletDropdownFundLink />
            
            {/* Custom Disconnect Button */}
            <div className="wallet-footer">
              <WalletDropdownDisconnect className="disconnect-button" />
            </div>
          </WalletDropdown>
        </Wallet>
      </div>

      {/* Connector Selection Modal */}
      <ConnectorModal
        isOpen={showConnectorModal}
        onClose={() => setShowConnectorModal(false)}
        onConnect={handleConnect}
      />
    </>
  );
}