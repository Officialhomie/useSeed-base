"use client";

import { useEffect } from 'react';
import { useAccount, useWatchContractEvent } from 'wagmi';
import { Address } from 'viem';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';

interface SpendSaveEventListenersProps {
  onSavingsProcessed: (token: Address, amount: bigint) => void;
  onDCAQueued: (fromToken: Address, toToken: Address, amount: bigint) => void;
}

export default function SpendSaveEventListeners({
  onSavingsProcessed,
  onDCAQueued
}: SpendSaveEventListenersProps) {
  const { address } = useAccount();

  // Listen for savings processed events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
    abi: [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            name: 'user',
            type: 'address'
          },
          {
            indexed: true,
            name: 'token',
            type: 'address'
          },
          {
            indexed: false,
            name: 'amount',
            type: 'uint256'
          }
        ],
        name: 'SavingsProcessed',
        type: 'event'
      }
    ],
    eventName: 'SavingsProcessed',
    onLogs: logs => {
      for (const log of logs) {
        const { args } = log;
        if (
          args?.user && 
          args?.token && 
          args?.amount && 
          args.user === address && 
          typeof args.token === 'string' && 
          typeof args.amount === 'bigint'
        ) {
          onSavingsProcessed(args.token as Address, args.amount);
        }
      }
    }
  });

  // Listen for DCA queue events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.DCA,
    abi: [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            name: 'user',
            type: 'address'
          },
          {
            indexed: true,
            name: 'fromToken',
            type: 'address'
          },
          {
            indexed: true,
            name: 'toToken',
            type: 'address'
          },
          {
            indexed: false,
            name: 'amount',
            type: 'uint256'
          }
        ],
        name: 'DCAQueued',
        type: 'event'
      }
    ],
    eventName: 'DCAQueued',
    onLogs: logs => {
      for (const log of logs) {
        const { args } = log;
        if (
          args?.user && 
          args?.fromToken && 
          args?.toToken && 
          args?.amount && 
          args.user === address && 
          typeof args.fromToken === 'string' && 
          typeof args.toToken === 'string' && 
          typeof args.amount === 'bigint'
        ) {
          onDCAQueued(args.fromToken as Address, args.toToken as Address, args.amount);
        }
      }
    }
  });

  return null;
} 