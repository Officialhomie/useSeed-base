"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, type ReactNode, useEffect } from "react";
import { WagmiProvider } from "wagmi";
import { config } from "../../wagmi";

// Optional components for loading and error states
const LoadingState = (): JSX.Element => (
  <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50">
    <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-[2px] rounded-lg animate-pulse">
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
      },
    },
  }));

  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Simulate initialization time
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return (
    <ErrorBoundary fallback={
      <div className="p-4 m-4 border border-red-500 rounded bg-red-50 text-red-900">
        <h2 className="text-lg font-semibold mb-2">Something went wrong</h2>
        <p>There was an error initializing the wallet connection. Please refresh the page or try again later.</p>
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