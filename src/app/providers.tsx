"use client";


import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect, useCallback } from "react";
import { useSwitchChain, useAccount, useChainId, WagmiProvider } from "wagmi";
import { config } from "../../wagmi";
import NotificationProvider from '@/components/core/NotificationManager';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

// Network Switch Modal Component
const NetworkSwitchModal = ({ 
  isOpen, 
  onClose, 
  onSwitch, 
  isSwitching 
}: {
  isOpen: boolean;
  onClose: () => void;
  onSwitch: () => void;
  isSwitching: boolean;
}) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-gray-900 rounded-xl p-6 max-w-md mx-4 border border-gray-800">
        <div className="flex items-center mb-4">
          <div className="w-12 h-12 bg-red-500/20 rounded-full flex items-center justify-center mr-4">
            <svg className="w-6 h-6 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white">Wrong Network</h3>
        </div>
        
        <p className="text-gray-400 mb-6">
          You're connected to the wrong network. SpendSave Protocol only works on Base mainnet. 
          Please switch to Base to continue using the app.
        </p>
        
        <div className="flex space-x-4">
          <button
            onClick={onClose}
            className="flex-1 py-3 px-4 bg-gray-700 hover:bg-gray-600 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSwitch}
            disabled={isSwitching}
            className="flex-1 py-3 px-4 bg-blue-600 hover:bg-blue-500 text-white rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSwitching ? (
              <>
                <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full mr-2"></div>
                Switching...
              </>
            ) : (
              'Switch to Base'
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// Network Validation Component
const NetworkValidator = ({ children }: { children: React.ReactNode }) => {
  const chainId = useChainId();
  const { isConnected } = useAccount();
  const { switchChain, isPending: isSwitching } = useSwitchChain();
  const [showNetworkModal, setShowNetworkModal] = useState(false);
  
  const isOnCorrectNetwork = chainId === base.id; // 8453
  
  // Check network when connected
  useEffect(() => {
    if (isConnected && !isOnCorrectNetwork) {
      // Show modal after a short delay to ensure wallet connection is complete
      const timer = setTimeout(() => {
        setShowNetworkModal(true);
      }, 1000);
      
      return () => clearTimeout(timer);
    } else if (isConnected && isOnCorrectNetwork) {
      setShowNetworkModal(false);
    }
  }, [isConnected, isOnCorrectNetwork]);
  
  const handleSwitchNetwork = useCallback(async () => {
    try {
      await switchChain({ chainId: base.id });
      setShowNetworkModal(false);
    } catch (error) {
      console.error('Failed to switch network:', error);
      // The modal will stay open so user can try again
    }
  }, [switchChain]);
  
  return (
    <>
      {children}
      <NetworkSwitchModal
        isOpen={showNetworkModal}
        onClose={() => setShowNetworkModal(false)}
        onSwitch={handleSwitchNetwork}
        isSwitching={isSwitching}
      />
    </>
  );
};

// Non-blocking wallet connection indicator
const WalletConnectionStatus = ({ status }: { status: 'connecting' | 'failed' | 'connected' | 'timeout' }): JSX.Element | null => {
  if (status === 'connected') return null;
  
  return (
    <div className="fixed top-4 right-4 z-50">
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[1px] rounded-lg">
        <div className="bg-black p-3 rounded-lg flex items-center space-x-2">
          {status === 'connecting' && (
            <div className="w-4 h-4 border-2 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin"></div>
          )}
          {status === 'failed' && (
            <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          {status === 'timeout' && (
            <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          )}
          <p className="text-white text-xs">
            {status === 'connecting' && 'Connecting wallet...'}
            {status === 'failed' && 'Wallet connection failed'}
            {status === 'timeout' && 'Wallet connection delayed'}
          </p>
        </div>
      </div>
    </div>
  );
};

const ErrorBoundary = ({ 
  children, 
  fallback 
}: { 
  children: ReactNode, 
  fallback: ReactNode 
}): JSX.Element => {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    const errorHandler = (error: ErrorEvent) => {
      console.error('Caught in ErrorBoundary:', error);
      setHasError(true);
    };

    window.addEventListener('error', errorHandler);
    
    // Enhanced fetch error handling with more robust fallbacks
    const handleFetchErrors = () => {
      const originalFetch = window.fetch;
      window.fetch = async (...args: Parameters<typeof originalFetch>) => {
        const url = typeof args[0] === 'string' ? args[0] : (args[0] as Request).url;
        const options = args[1] || {};
        
        // Skip interception for non-RPC requests
        if (!url || typeof url !== 'string' || 
            (!url.includes('alchemy.com') && 
             !url.includes('base-sepolia') && 
             !url.includes('base.org'))) {
          return originalFetch(...args);
        }

        try {
          // Add proper CORS headers if missing
          const updatedOptions = { ...options };
          if (!updatedOptions.mode) {
            (updatedOptions as RequestInit).mode = 'cors';
          }
          
          // Add cache control for RPC requests
          if (!updatedOptions.cache) {
            (updatedOptions as RequestInit).cache = 'no-cache';
          }
          
          // Use a reasonable timeout for RPC requests
          const controller = new AbortController();
          const { signal } = controller;
          const timeoutId = setTimeout(() => {
            controller.abort();
          }, 10000);
          
          try {
            const response = await originalFetch(url, {
              ...updatedOptions,
              signal,
            });
            
            clearTimeout(timeoutId);
            
            // Handle server errors
            if (!response.ok) {
              console.warn(`Server error (${response.status}) for ${url}`);
              throw new Error(`HTTP error ${response.status}`);
            }
            
            return response;
          } catch (error: any) {
            clearTimeout(timeoutId);
            
            // Log but don't repeatedly report the same errors
            console.error('Fetch operation failed:', error);
            
            // For development debugging only
            if (process.env.NODE_ENV === 'development') {
              // If CORS error, suggest solutions
              if (error.message && error.message.includes('CORS')) {
                console.info('CORS error detected. Consider using a proxy or a CORS-enabled endpoint');
              }
            }
            
            throw error;
          }
        } catch (error: any) {
          // Fall through to original fetch as last resort
          return originalFetch(...args);
        }
      };
    };
    
    handleFetchErrors();
    
    return () => window.removeEventListener('error', errorHandler);
  }, []);

  return hasError ? <>{fallback}</> : <>{children}</>;
};

export function Providers({ children }: { children: React.ReactNode }): JSX.Element {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5,
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false,
      },
      mutations: {
        retry: 2,
        retryDelay: 1000,
      },
    },
  }));

  return (
    <OnchainKitProvider
      apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
      chain={base}
      config={{
        appearance: {
          name: 'SpendSave Protocol',
          mode: 'auto',
          theme: 'default',
        },
      }}
    >
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            <NetworkValidator>
              {children}
            </NetworkValidator>
          </NotificationProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </OnchainKitProvider>
  );
}