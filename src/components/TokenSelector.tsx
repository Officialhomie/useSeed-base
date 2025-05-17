"use client";

import React, { useState, useEffect, useRef } from 'react';
import { FiSearch, FiX, FiChevronDown } from 'react-icons/fi';
import { Token } from '@/lib/hooks/useTokenList';
import { useTokenBalances } from '@/lib/hooks/useTokenBalances';

interface TokenSelectorProps {
  value: Token | null;
  onChange: (token: Token) => void;
  tokens: Token[];
  label?: string;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function TokenSelector({ 
  value, 
  onChange, 
  tokens = [], // Provide default empty array
  label = "Select Token",
  disabled = false,
  isLoading = false
}: TokenSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const modalRef = useRef<HTMLDivElement>(null);
  const { tokenBalances, isLoading: isLoadingBalances } = useTokenBalances();

  // Close modal when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset search query when modal is closed
  useEffect(() => {
    if (!isOpen) {
      setSearchQuery('');
    }
  }, [isOpen]);

  // Filter tokens based on search query
  const filteredTokens = tokens ? tokens.filter(token => 
    token.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
    token.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) : [];

  const handleTokenSelect = (token: Token) => {
    onChange(token);
    setIsOpen(false);
  };

  // Get token balance from our useTokenBalances hook
  const getTokenBalance = (symbol: string) => {
    if (isLoadingBalances) return 'Loading...';
    
    if (tokenBalances && tokenBalances[symbol]) {
      return tokenBalances[symbol].formattedBalance;
    }
    
    return '0';
  };

  // Format price display with loading state
  const formatTokenPrice = (token: Token) => {
    if (token.priceLoading) {
      return 'Loading price...';
    }
    return `$${token.price.toFixed(2)}`;
  };

  // Token logo placeholder (in a real app, you'd integrate actual token logos)
  const getTokenLogo = (symbol: string) => {
    const tokenColorMap: Record<string, string> = {
      'ETH': 'bg-blue-500',
      'WETH': 'bg-blue-400',
      'USDC': 'bg-green-500',
    };

    const color = tokenColorMap[symbol] || 'bg-gray-500';
    
    return (
      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${color}`}>
        <span className="text-white font-bold text-xs">{symbol.substring(0, 2)}</span>
      </div>
    );
  };

  return (
    <div className="relative">
      {/* Token Select Button */}
      <button
        className={`bg-gray-700 hover:bg-gray-600 text-white px-3 py-2 rounded-lg font-medium flex items-center ${disabled || isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
        onClick={() => !disabled && !isLoading && setIsOpen(true)}
        type="button"
        disabled={disabled || isLoading}
      >
        {value ? (
          <>
            <span className="mr-2">{getTokenLogo(value.symbol)}</span>
            <span>{value.symbol}</span>
            {tokenBalances && tokenBalances[value.symbol] && (
              <span className="ml-2 text-sm text-gray-400 hidden sm:inline">
                Balance: {tokenBalances[value.symbol].formattedBalance}
              </span>
            )}
          </>
        ) : (
          <span>{isLoading ? "Loading..." : label}</span>
        )}
        <FiChevronDown className="ml-2" />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
          <div 
            ref={modalRef}
            className="bg-gray-900 rounded-xl w-full max-w-md mx-4 p-4 animate-fade-in-up"
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-lg font-bold text-white">Select a token</h3>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <FiX size={24} />
              </button>
            </div>

            {/* Search Input */}
            <div className="relative mb-4">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <FiSearch className="text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Search name or paste address"
                className="bg-gray-800 text-white pl-10 pr-4 py-3 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
            </div>

            {/* Token List */}
            <div className="max-h-96 overflow-y-auto">
              {isLoading ? (
                <div className="text-center py-4 text-gray-400">
                  Loading tokens...
                </div>
              ) : filteredTokens.length > 0 ? (
                filteredTokens.map(token => (
                  <button
                    key={token.address}
                    className="w-full flex items-center px-4 py-3 hover:bg-gray-800 rounded-lg transition-colors mb-1"
                    onClick={() => handleTokenSelect(token)}
                  >
                    <div className="mr-3">
                      {getTokenLogo(token.symbol)}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium text-white">{token.symbol}</span>
                      <span className="text-sm text-gray-400">{token.name}</span>
                    </div>
                    <div className="ml-auto flex flex-col items-end">
                      <span className="text-white">{getTokenBalance(token.symbol)}</span>
                      <span className={`text-xs ${token.priceLoading ? 'text-gray-500' : 'text-gray-400'}`}>
                        {formatTokenPrice(token)}
                      </span>
                    </div>
                  </button>
                ))
              ) : (
                <div className="text-center py-4 text-gray-400">
                  {searchQuery ? 
                    `No tokens found matching "${searchQuery}"` : 
                    "No tokens available"}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 