"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../../wagmi";

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
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 seconds timeout
          
          const fetchOptions = args[1] || {};
          const newOptions = {
            ...fetchOptions,
            signal: controller.signal,
          };
          
          const response = await originalFetch(args[0], newOptions);
          clearTimeout(timeoutId);
          
          if (!response.ok && response.status >= 500) {
            console.warn(`Fetch error for ${args[0]}:`, response.status);
          }
          return response;
        } catch (error) {
          console.error('Fetch operation failed:', error);
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
  
  // Handle static asset preload
  useEffect(() => {
    const preloadAssets = () => {
      try {
        // Preload critical assets used by the wallet with correct paths
        const importantAssets = [
          '/static/css/smart-wallet.css', 
          '/logo.png'
        ];
        
        // Remove any existing preloads to avoid duplicates
        document.querySelectorAll('link[rel="preload"]').forEach(link => {
          link.remove();
        });
        
        // Add new preloads with proper attributes
        importantAssets.forEach(asset => {
          const link = document.createElement('link');
          link.rel = 'preload';
          link.href = asset;
          
          // Set appropriate 'as' attribute based on file extension
          if (asset.endsWith('.css')) {
            link.as = 'style';
            // For CSS files, also add a stylesheet link to ensure they are used
            const styleLink = document.createElement('link');
            styleLink.rel = 'stylesheet';
            styleLink.href = asset;
            document.head.appendChild(styleLink);
          } else if (asset.endsWith('.png') || asset.endsWith('.jpg') || asset.endsWith('.svg')) {
            link.as = 'image';
          } else if (asset.endsWith('.js')) {
            link.as = 'script';
          }
          
          document.head.appendChild(link);
        });
      } catch (e) {
        console.warn('Asset preloading failed:', e);
      }
    };
    
    // Call preload immediately
    preloadAssets();
    
    // Also call preload when window loads to ensure assets are actually used
    window.addEventListener('load', () => {
      setTimeout(preloadAssets, 100);
    });
    
    return () => {
      window.removeEventListener('load', preloadAssets);
    };
  }, []);

  useEffect(() => {
    // Initialize wallet with better retry logic
    const initializeWallet = () => {
      setIsLoading(true);
      
      // Attempt initialization with increasing timeouts to handle slow connections
      const timer = setTimeout(() => {
        if (connectionAttempts < 3) {
          setConnectionAttempts(prev => prev + 1);
          setIsLoading(false);
        } else {
          console.warn('Multiple connection attempts needed, but proceeding anyway');
          setIsLoading(false);
        }
      }, 1000 + connectionAttempts * 500); // Incremental timeout
      
      return () => clearTimeout(timer);
    };
    
    initializeWallet();
    
    // Track wallet connection status
    const handleOnline = () => {
      // When the browser comes back online, try to reconnect the wallet
      if (!isLoading && connectionAttempts > 0) {
        setConnectionAttempts(0);
        setIsLoading(true);
        setTimeout(() => setIsLoading(false), 1500);
      }
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
          {isLoading ? <LoadingState /> : children}
        </QueryClientProvider>
      </WagmiProvider>
    </ErrorBoundary>
  );
} 