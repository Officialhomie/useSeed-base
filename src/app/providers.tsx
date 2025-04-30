"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../../wagmi";
import NotificationProvider from '@/components/NotificationManager';

// Optional components for loading and error states
const LoadingState = (): JSX.Element => (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[2px] rounded-lg">
      <div className="bg-black p-4 rounded-lg flex flex-col items-center">
        <div className="w-10 h-10 border-4 border-t-blue-500 border-r-transparent border-b-purple-500 border-l-transparent rounded-full animate-spin mb-4"></div>
        <p className="text-white text-sm">Initializing wallet connection...</p>
      </div>
    </div>
  </div>
);

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
    
    // Enhanced fetch error handling with timeout
    const handleFetchErrors = () => {
      const originalFetch = window.fetch;
      window.fetch = async (...args) => {
        try {
          // Add timeout to fetch requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => {
            controller.abort();
            console.warn(`Fetch timeout for ${typeof args[0] === 'string' ? args[0] : 'request'}`);
          }, 10000); // Reduced timeout to 10 seconds
          
          const fetchOptions = args[1] || {};
          const newOptions = {
            ...fetchOptions,
            signal: controller.signal,
          };
          
          const response = await originalFetch(args[0], newOptions);
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            // Handle specific error statuses
            if (response.status >= 500) {
              console.warn(`Server error (${response.status}) for ${typeof args[0] === 'string' ? args[0] : 'request'}`);
              
              // If request is to Base Sepolia and it fails, try to use the fallback
              if (typeof args[0] === 'string' && args[0].includes('sepolia.base.org')) {
                console.info('Attempting to use fallback RPC...');
                const fallbackUrl = args[0].replace('sepolia.base.org', 'base-sepolia-rpc.publicnode.com');
                const fallbackResponse = await originalFetch(fallbackUrl, newOptions);
                return fallbackResponse;
              }
            }
          }
          return response;
        } catch (error) {
          console.error('Fetch operation failed:', error);
          
          // If request is to Base Sepolia and it fails, try to use the fallback
          if (typeof args[0] === 'string' && args[0].includes('sepolia.base.org')) {
            try {
              console.info('Error caught, attempting to use fallback RPC...');
              const controller = new AbortController();
              const timeoutId = setTimeout(() => controller.abort(), 10000);
              
              const fetchOptions = args[1] || {};
              const newOptions = {
                ...fetchOptions,
                signal: controller.signal,
              };
              
              const fallbackUrl = args[0].replace('sepolia.base.org', 'base-sepolia-rpc.publicnode.com');
              const fallbackResponse = await originalFetch(fallbackUrl, newOptions);
              clearTimeout(timeoutId);
              return fallbackResponse;
            } catch (fallbackError) {
              console.error('Fallback RPC also failed:', fallbackError);
            }
          }
          
          // Create a more detailed error response
          return new Response(JSON.stringify({ 
            error: 'Network request failed', 
            details: error instanceof Error ? error.message : 'Unknown error',
            timestamp: new Date().toISOString()
          }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' }
          });
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

  const [isLoading, setIsLoading] = useState(true);
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

  // Improved wallet initialization with better error handling
  useEffect(() => {
    // Only try to initialize if we haven't hit max attempts
    if (connectionAttempts >= 3) {
      console.warn('Max connection attempts reached, proceeding anyway');
      setIsLoading(false);
      return;
    }
    
    const initializeWallet = async () => {
      setIsLoading(true);
      
      try {
        // Simulate wallet initialization
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Successfully initialized
        setIsLoading(false);
      } catch (error) {
        console.error('Wallet initialization error:', error);
        
        // Increment attempt counter and retry if under max attempts
        if (connectionAttempts < 2) {
          setConnectionAttempts(prev => prev + 1);
          // Give some delay before retrying
          setTimeout(() => {
            setIsLoading(false);
          }, 1000);
        } else {
          // Max retries reached, proceed anyway
          console.warn('Multiple connection attempts needed, but proceeding anyway');
          setIsLoading(false);
        }
      }
    };
    
    initializeWallet();
    
    // Track wallet connection status
    const handleOnline = () => {
      // When the browser comes back online, reset connection attempts
      setConnectionAttempts(0);
    };
    
    window.addEventListener('online', handleOnline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }, [connectionAttempts, isLoading]);

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
      <WagmiProvider config={config}>
        <QueryClientProvider client={queryClient}>
          <NotificationProvider>
            {isLoading ? <LoadingState /> : children}
          </NotificationProvider>
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
} 