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

export interface BeforeSwapExecutedEvent {
  user: Address;
  token0: Address;
  token1: Address;
  originalAmount: bigint;
  adjustedAmount: bigint;
  timestamp: number;
}

export interface AfterSwapExecutedEvent {
  user: Address;
  token: Address;
  receivedAmount: bigint;
  savedAmount: bigint;
  timestamp: number;
}

export interface SwapSummary {
  timestamp: number;
  fromToken: Address;
  toToken: Address;
  fromAmount: bigint;
  toAmount: bigint;
  savedAmount: bigint | null;
  eventType: 'swap' | 'savings' | 'dca';
}

export default function useSpendSaveEvents() {
  const { address } = useAccount();
  const [inputTokenSavedEvents, setInputTokenSavedEvents] = useState<SavedTokenEvent[]>([]);
  const [outputSavingsEvents, setOutputSavingsEvents] = useState<OutputSavingsEvent[]>([]);
  const [dcaQueuedEvents, setDcaQueuedEvents] = useState<DcaQueuedEvent[]>([]);
  const [beforeSwapEvents, setBeforeSwapEvents] = useState<BeforeSwapExecutedEvent[]>([]);
  const [afterSwapEvents, setAfterSwapEvents] = useState<AfterSwapExecutedEvent[]>([]);
  
  // For easier consumption in UI components
  const [recentEvents, setRecentEvents] = useState<SwapSummary[]>([]);

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
        const newEvents = userEvents.map(log => ({
          user: log.args.user as Address,
          token: log.args.token as Address,
          savedAmount: log.args.savedAmount as bigint,
          remainingSwapAmount: log.args.remainingSwapAmount as bigint,
          timestamp: Date.now()
        }));
        
        setInputTokenSavedEvents(prev => [...prev, ...newEvents]);
        
        // Update summary events
        newEvents.forEach(event => {
          setRecentEvents(prev => [
            {
              timestamp: event.timestamp,
              fromToken: event.token,
              toToken: event.token, // Same token for savings
              fromAmount: event.savedAmount,
              toAmount: event.savedAmount,
              savedAmount: event.savedAmount,
              eventType: 'savings' as const
            } satisfies SwapSummary,
            ...prev
          ].slice(0, 10)); // Keep only recent 10 events
        });
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
        const newEvents = userEvents.map(log => ({
          user: log.args.user as Address,
          token: log.args.token as Address,
          amount: log.args.amount as bigint,
          timestamp: Date.now()
        }));
        
        setOutputSavingsEvents(prev => [...prev, ...newEvents]);
        
        // Update summary events
        newEvents.forEach(event => {
          setRecentEvents(prev => [
            {
              timestamp: event.timestamp,
              fromToken: event.token,
              toToken: event.token, // Same token for savings
              fromAmount: event.amount,
              toAmount: event.amount,
              savedAmount: event.amount,
              eventType: 'savings' as const
            } satisfies SwapSummary,
            ...prev
          ].slice(0, 10));
        });
      }
    },
  });

  // Watch for BeforeSwapExecuted events
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
            name: "token0",
            type: "address"
          },
          {
            indexed: true,
            internalType: "address",
            name: "token1",
            type: "address"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "originalAmount",
            type: "uint256"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "adjustedAmount",
            type: "uint256"
          }
        ],
        name: "BeforeSwapExecuted",
        type: "event"
      }
    ],
    eventName: 'BeforeSwapExecuted',
    onLogs(logs) {
      // Filter events for the current user
      const userEvents = logs.filter(log => 
        log.args.user?.toLowerCase() === address?.toLowerCase()
      );
      
      if (userEvents.length > 0) {
        const newEvents = userEvents.map(log => ({
          user: log.args.user as Address,
          token0: log.args.token0 as Address,
          token1: log.args.token1 as Address,
          originalAmount: log.args.originalAmount as bigint,
          adjustedAmount: log.args.adjustedAmount as bigint,
          timestamp: Date.now()
        }));
        
        setBeforeSwapEvents(prev => [...prev, ...newEvents]);
      }
    },
  });

  // Watch for AfterSwapExecuted events
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
            name: "receivedAmount",
            type: "uint256"
          },
          {
            indexed: false,
            internalType: "uint256",
            name: "savedAmount",
            type: "uint256"
          }
        ],
        name: "AfterSwapExecuted",
        type: "event"
      }
    ],
    eventName: 'AfterSwapExecuted',
    onLogs(logs) {
      // Filter events for the current user
      const userEvents = logs.filter(log => 
        log.args.user?.toLowerCase() === address?.toLowerCase()
      );
      
      if (userEvents.length > 0) {
        const newEvents = userEvents.map(log => ({
          user: log.args.user as Address,
          token: log.args.token as Address,
          receivedAmount: log.args.receivedAmount as bigint,
          savedAmount: log.args.savedAmount as bigint,
          timestamp: Date.now()
        }));
        
        setAfterSwapEvents(prev => [...prev, ...newEvents]);
        
        // Update summary events when AfterSwap events are received
        // (Note: we get better information from DCAExecuted events for full swap data,
        // but this ensures we capture the savings amount)
        newEvents.forEach(event => {
          setRecentEvents(prev => [
            {
              timestamp: event.timestamp,
              fromToken: CONTRACT_ADDRESSES.ETH, // Placeholder, will be updated if matched with a DCA event
              toToken: event.token,
              fromAmount: BigInt(0), // Placeholder
              toAmount: event.receivedAmount,
              savedAmount: event.savedAmount,
              eventType: 'swap' as const
            } satisfies SwapSummary,
            ...prev
          ].slice(0, 10));
        });
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
        const newEvents = userEvents.map(log => ({
          user: log.args.user as Address,
          fromToken: log.args.fromToken as Address,
          toToken: log.args.toToken as Address,
          amount: log.args.amount as bigint,
          executionTick: log.args.executionTick as number,
          timestamp: Date.now()
        }));
        
        setDcaQueuedEvents(prev => [...prev, ...newEvents]);
        
        // Update summary events
        newEvents.forEach(event => {
          setRecentEvents(prev => [
            {
              timestamp: event.timestamp,
              fromToken: event.fromToken,
              toToken: event.toToken,
              fromAmount: event.amount,
              toAmount: BigInt(0), // This is a queued event, no output yet
              savedAmount: null,
              eventType: 'dca' as const
            } satisfies SwapSummary,
            ...prev
          ].slice(0, 10));
        });
      }
    },
  });

  // Clear all events when address changes
  useEffect(() => {
    setInputTokenSavedEvents([]);
    setOutputSavingsEvents([]);
    setDcaQueuedEvents([]);
    setBeforeSwapEvents([]);
    setAfterSwapEvents([]);
    setRecentEvents([]);
  }, [address]);

  return {
    inputTokenSavedEvents,
    outputSavingsEvents,
    dcaQueuedEvents,
    beforeSwapEvents,
    afterSwapEvents,
    recentEvents
  };
} 