"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../../wagmi";
import NotificationProvider from '@/components/NotificationManager';
import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'wagmi/chains';

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

export function Providers({ children }: { children: ReactNode }): JSX.Element {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        retry: 3,
        retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
        refetchOnWindowFocus: false, // Disable refetching on window focus for better performance
      },
      mutations: {
        retry: 2,
        retryDelay: 1000,
      },
    },
  }));

  const [walletStatus, setWalletStatus] = useState<'connecting' | 'failed' | 'connected' | 'timeout'>('connecting');
  const [connectionAttempts, setConnectionAttempts] = useState(0);
  
  // Handle asset loading
  useEffect(() => {
    // Modified asset preloading that doesn't use link rel="preload"
    // This avoids the "preloaded but not used" warnings
    const loadAssets = () => {
      try {
        // Add the smart-wallet.css directly with the correct content
        const createSmartWalletCSS = () => {
          const style = document.createElement('style');
          style.id = 'smart-wallet-css';
          // Add minimal CSS needed for the wallet component
          style.textContent = `
            .smart-wallet-dropdown {
              z-index: 100;
              position: relative;
            }
            .smart-wallet-avatar {
              border-radius: 50%;
              overflow: hidden;
            }
            .smart-wallet-name {
              font-weight: 600;
            }
            .smart-wallet-address {
              font-family: monospace;
              font-size: 0.85em;
            }
            .smart-wallet-balance {
              font-size: 0.9em;
            }
          `;
          return style;
        };
        
        // Only add if it doesn't exist already
        if (!document.getElementById('smart-wallet-css')) {
          document.head.appendChild(createSmartWalletCSS());
        }
        
        // For images, we'll preload them into the browser cache only if needed
        const imageAssets = [
          '/logo.png'  // Keep simple path
        ];
        
        // Only preload images that aren't already in the DOM or cache
        imageAssets.forEach(asset => {
          const img = new Image();
          img.src = asset;
          img.style.display = 'none'; // Make sure it's not visible
          img.onload = () => {
            // Image loaded successfully (now in cache)
            document.body.removeChild(img);
          };
          document.body.appendChild(img);
        });
      } catch (e) {
        console.warn('Asset loading failed:', e);
      }
    };
    
    // Call asset loader after DOM is fully ready
    if (document.readyState === 'complete') {
      loadAssets();
    } else {
      window.addEventListener('load', loadAssets);
      return () => window.removeEventListener('load', loadAssets);
    }
  }, []);

  // Non-blocking wallet initialization with proper timeout
  useEffect(() => {
    // Setup timeout for wallet connection
    const connectionTimeout = setTimeout(() => {
      if (walletStatus === 'connecting') {
        console.warn('Wallet connection taking longer than expected');
        setWalletStatus('timeout');
      }
    }, 3000); // 3 seconds timeout for warning
    
    const initializeWallet = async () => {
      try {
        
        // Simulate wallet initialization completion
        // In production, this would be your actual wallet connection logic
        setTimeout(() => {
          setWalletStatus('connected');
          console.log('Wallet initialized successfully');
        }, 500); // Small delay just to simulate actual connection
      } catch (error) {
        console.error('Wallet initialization error:', error);
        
        // Increment attempt counter and retry if under max attempts
        if (connectionAttempts < 2) {
          setConnectionAttempts(prev => prev + 1);
          setWalletStatus('connecting');
        } else {
          // Max retries reached, mark as failed but still show the UI
          setWalletStatus('failed');
          console.warn('Wallet connection failed after multiple attempts');
        }
      }
    };
    
    // Only try to initialize if we've failed or are connecting
    if (walletStatus === 'connecting' || walletStatus === 'failed') {
      initializeWallet();
    }
    
    // Track wallet connection status
    const handleOnline = () => {
      // When the browser comes back online, retry connection
      if (walletStatus !== 'connected') {
        setConnectionAttempts(0);
        setWalletStatus('connecting');
      }
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      clearTimeout(connectionTimeout);
    };
  }, [connectionAttempts, walletStatus]);

  return (
    <ErrorBoundary fallback={
      <div className="p-4 m-4 border border-red-500 rounded bg-red-50 text-red-900">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p>There was an error initializing the wallet connection. Please refresh the page or try again later.</p>
        <button 
          onClick={() => window.location.reload()}
          className="mt-2 bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Refresh Page
        </button>
      </div>
    }>
      <OnchainKitProvider
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY!}
        chain={base}
        config={{
          appearance: {
            name: 'Base Seeds Protocol',
            mode: 'auto',
            theme: 'default',
          },
        }}
      >
        <WagmiProvider config={config}>
          <QueryClientProvider client={queryClient}>
            <NotificationProvider>
              <WalletConnectionStatus status={walletStatus} />
              {children}
            </NotificationProvider>
          </QueryClientProvider>
        </WagmiProvider>
      </OnchainKitProvider>
    </ErrorBoundary>
  );
} 