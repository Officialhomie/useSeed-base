import { useState, useEffect } from 'react';
import { useAccount, usePublicClient, useWatchContractEvent } from 'wagmi';
import { CONTRACT_ADDRESSES } from '@/lib/contracts';
import { Address } from 'viem';

export interface SavedTokenEvent {
  user: Address;
  token: Address;
  savedAmount: bigint;
  remainingSwapAmount: bigint;
  timestamp: number;
}

export interface OutputSavingsEvent {
  user: Address;
  token: Address;
  amount: bigint;
  timestamp: number;
}

export interface DcaQueuedEvent {
  user: Address;
  fromToken: Address;
  toToken: Address;
  amount: bigint;
  executionTick: number;
  timestamp: number;
}

export default function useSpendSaveEvents() {
  const { address } = useAccount();
  const [inputTokenSavedEvents, setInputTokenSavedEvents] = useState<SavedTokenEvent[]>([]);
  const [outputSavingsEvents, setOutputSavingsEvents] = useState<OutputSavingsEvent[]>([]);
  const [dcaQueuedEvents, setDcaQueuedEvents] = useState<DcaQueuedEvent[]>([]);

  // Watch for InputTokenSaved events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.SAVING_STRATEGY,
    abi: [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "user",
            type: "address"
          },
          {
            indexed: true,
            internalType: "address",
            name: "token",
            type: "address"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "savedAmount",
            type: "uint256"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "remainingSwapAmount",
            type: "uint256"
          }
        ],
        name: "InputTokenSaved",
        type: "event"
      }
    ],
    eventName: 'InputTokenSaved',
    onLogs(logs) {
      // Filter events for the current user
      const userEvents = logs.filter(log => 
        log.args.user?.toLowerCase() === address?.toLowerCase()
      );
      
      if (userEvents.length > 0) {
        setInputTokenSavedEvents(prev => [
          ...prev,
          ...userEvents.map(log => ({
            user: log.args.user as Address,
            token: log.args.token as Address,
            savedAmount: log.args.savedAmount as bigint,
            remainingSwapAmount: log.args.remainingSwapAmount as bigint,
            timestamp: Date.now()
          }))
        ]);
      }
    },
  });

  // Watch for OutputSavingsProcessed events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
    abi: [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "user",
            type: "address"
          },
          {
            indexed: true,
            internalType: "address",
            name: "token",
            type: "address"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          }
        ],
        name: "OutputSavingsProcessed",
        type: "event"
      }
    ],
    eventName: 'OutputSavingsProcessed',
    onLogs(logs) {
      // Filter events for the current user
      const userEvents = logs.filter(log => 
        log.args.user?.toLowerCase() === address?.toLowerCase()
      );
      
      if (userEvents.length > 0) {
        setOutputSavingsEvents(prev => [
          ...prev,
          ...userEvents.map(log => ({
            user: log.args.user as Address,
            token: log.args.token as Address,
            amount: log.args.amount as bigint,
            timestamp: Date.now()
          }))
        ]);
      }
    },
  });

  // Watch for DCAQueued events
  useWatchContractEvent({
    address: CONTRACT_ADDRESSES.DCA,
    abi: [
      {
        anonymous: false,
        inputs: [
          {
            indexed: true,
            internalType: "address",
            name: "user",
            type: "address"
          },
          {
            indexed: true,
            internalType: "address",
            name: "fromToken",
            type: "address"
          },
          {
            indexed: true,
            internalType: "address",
            name: "toToken",
            type: "address"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "amount",
            type: "uint256"
          },
          {
            indexed: false,
            internalType: "int24",
            name: "executionTick",
            type: "int24"
          }
        ],
        name: "DCAQueued",
        type: "event"
      }
    ],
    eventName: 'DCAQueued',
    onLogs(logs) {
      // Filter events for the current user
      const userEvents = logs.filter(log => 
        log.args.user?.toLowerCase() === address?.toLowerCase()
      );
      
      if (userEvents.length > 0) {
        setDcaQueuedEvents(prev => [
          ...prev,
          ...userEvents.map(log => ({
            user: log.args.user as Address,
            fromToken: log.args.fromToken as Address,
            toToken: log.args.toToken as Address,
            amount: log.args.amount as bigint,
            executionTick: log.args.executionTick as number,
            timestamp: Date.now()
          }))
        ]);
      }
    },
  });

  return {
    inputTokenSavedEvents,
    outputSavingsEvents,
    dcaQueuedEvents
  };
} 