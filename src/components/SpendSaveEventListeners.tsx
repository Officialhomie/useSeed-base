"use client";

import { useEffect } from 'react';
import { useAccount, useContractEvent } from 'wagmi';
import { Address, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { useNotification } from '@/components/NotificationManager';

interface SpendSaveEventListenersProps {
  onSavingsProcessed?: (token: Address, amount: bigint) => void;
  onDCAQueued?: (fromToken: Address, toToken: Address, amount: bigint) => void;
  onDCAExecuted?: (fromToken: Address, toToken: Address, fromAmount: bigint, toAmount: bigint) => void;
}

export default function SpendSaveEventListeners({
  onSavingsProcessed,
  onDCAQueued,
  onDCAExecuted
}: SpendSaveEventListenersProps) {
  const { address } = useAccount();
  const { addNotification } = useNotification();

  // Format token amount for display
  const formatTokenAmount = (amount: bigint, tokenAddress: Address): string => {
    // This is simplified - in a real implementation you would get the token decimals dynamically
    const decimals = tokenAddress === CONTRACT_ADDRESSES.ETH ? 18 : 
                     tokenAddress === CONTRACT_ADDRESSES.USDC ? 6 : 18;
    
    const formattedAmount = formatUnits(amount, decimals);
    return formattedAmount;
  };

  // Get token symbol from address
  const getTokenSymbol = (tokenAddress: Address): string => {
    if (tokenAddress === CONTRACT_ADDRESSES.ETH) return 'ETH';
    if (tokenAddress === CONTRACT_ADDRESSES.USDC) return 'USDC';
    if (tokenAddress === CONTRACT_ADDRESSES.WETH) return 'WETH';
    return 'Unknown Token';
  };

  // Listen for InputTokenSaved events
  useContractEvent({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
    abi: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: 'user', type: 'address' },
          { indexed: true, name: 'token', type: 'address' },
          { indexed: false, name: 'savedAmount', type: 'uint256' },
          { indexed: false, name: 'remainingSwapAmount', type: 'uint256' }
        ],
        name: 'InputTokenSaved',
        type: 'event'
      }
    ],
    eventName: 'InputTokenSaved',
    listener(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args.user === address) {
          const formattedAmount = formatTokenAmount(args.savedAmount, args.token);
          const tokenSymbol = getTokenSymbol(args.token);
          
          addNotification({
            type: 'success',
            title: 'Savings Added',
            message: `Saved ${formattedAmount} ${tokenSymbol} to your savings`,
            autoClose: true,
            linkUrl: '/app-dashboard/savings',
            linkText: 'View Savings'
          });
          
          onSavingsProcessed?.(args.token, args.savedAmount);
        }
      });
    },
  });

  // Listen for OutputSavingsProcessed events
  useContractEvent({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
    abi: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: 'user', type: 'address' },
          { indexed: true, name: 'token', type: 'address' },
          { indexed: false, name: 'amount', type: 'uint256' }
        ],
        name: 'OutputSavingsProcessed',
        type: 'event'
      }
    ],
    eventName: 'OutputSavingsProcessed',
    listener(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args.user === address) {
          const formattedAmount = formatTokenAmount(args.amount, args.token);
          const tokenSymbol = getTokenSymbol(args.token);
          
          addNotification({
            type: 'success',
            title: 'Output Savings Added',
            message: `Saved ${formattedAmount} ${tokenSymbol} from swap output`,
            autoClose: true,
            linkUrl: '/app-dashboard/savings',
            linkText: 'View Savings'
          });
          
          onSavingsProcessed?.(args.token, args.amount);
        }
      });
    },
  });

  // Listen for DCAQueued events
  useContractEvent({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
    abi: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: 'user', type: 'address' },
          { indexed: true, name: 'fromToken', type: 'address' },
          { indexed: true, name: 'toToken', type: 'address' },
          { indexed: false, name: 'amount', type: 'uint256' },
          { indexed: false, name: 'executionTick', type: 'int24' }
        ],
        name: 'DCAQueued',
        type: 'event'
      }
    ],
    eventName: 'DCAQueued',
    listener(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args.user === address) {
          const formattedAmount = formatTokenAmount(args.amount, args.fromToken);
          const fromTokenSymbol = getTokenSymbol(args.fromToken);
          const toTokenSymbol = getTokenSymbol(args.toToken);
          
          addNotification({
            type: 'info',
            title: 'DCA Queued',
            message: `Added ${formattedAmount} ${fromTokenSymbol} to DCA queue for conversion to ${toTokenSymbol}`,
            autoClose: true,
            linkUrl: '/app-dashboard/dca',
            linkText: 'View DCA Queue'
          });
          
          onDCAQueued?.(args.fromToken, args.toToken, args.amount);
        }
      });
    },
  });

  // Listen for DCAExecuted events
  useContractEvent({
    address: CONTRACT_ADDRESSES.DCA,
    abi: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: 'user', type: 'address' },
          { indexed: true, name: 'fromToken', type: 'address' },
          { indexed: true, name: 'toToken', type: 'address' },
          { indexed: false, name: 'fromAmount', type: 'uint256' },
          { indexed: false, name: 'toAmount', type: 'uint256' }
        ],
        name: 'DCAExecuted',
        type: 'event'
      }
    ],
    eventName: 'DCAExecuted',
    listener(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args.user === address) {
          const formattedFromAmount = formatTokenAmount(args.fromAmount, args.fromToken);
          const formattedToAmount = formatTokenAmount(args.toAmount, args.toToken);
          const fromTokenSymbol = getTokenSymbol(args.fromToken);
          const toTokenSymbol = getTokenSymbol(args.toToken);
          
          addNotification({
            type: 'success',
            title: 'DCA Executed',
            message: `Converted ${formattedFromAmount} ${fromTokenSymbol} to ${formattedToAmount} ${toTokenSymbol}`,
            autoClose: true,
            linkUrl: '/app-dashboard/savings',
            linkText: 'View Savings'
          });
          
          onDCAExecuted?.(args.fromToken, args.toToken, args.fromAmount, args.toAmount);
        }
      });
    },
  });

  // Listen for SlippageExceeded events
  useContractEvent({
    address: CONTRACT_ADDRESSES.SLIPPAGE_CONTROL,
    abi: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, name: 'user', type: 'address' },
          { indexed: true, name: 'fromToken', type: 'address' },
          { indexed: true, name: 'toToken', type: 'address' },
          { indexed: false, name: 'expectedMinimum', type: 'uint256' },
          { indexed: false, name: 'actualToAmount', type: 'uint256' }
        ],
        name: 'SlippageExceeded',
        type: 'event'
      }
    ],
    eventName: 'SlippageExceeded',
    listener(logs) {
      logs.forEach((log) => {
        const { args } = log;
        if (args.user === address) {
          const formattedExpected = formatTokenAmount(args.expectedMinimum, args.toToken);
          const formattedActual = formatTokenAmount(args.actualToAmount, args.toToken);
          const toTokenSymbol = getTokenSymbol(args.toToken);
          
          addNotification({
            type: 'warning',
            title: 'Slippage Exceeded',
            message: `Received ${formattedActual} ${toTokenSymbol} instead of expected minimum ${formattedExpected} ${toTokenSymbol}`,
            autoClose: true,
            linkUrl: '/app-dashboard/settings',
            linkText: 'Adjust Slippage'
          });
        }
      });
    },
  });

  return null; // This component doesn't render anything
} 