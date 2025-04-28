import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

// Enhanced connector with better error handling and configuration
export const cbWalletConnector = coinbaseWallet({
  appName: "SpendSave Protocol",
  appLogoUrl: "/logo.png", // Optional logo URL
  preference: "smartWalletOnly",
  defaultChainId: baseSepolia.id,
});

// Custom logger for development debugging
const logger = {
  error: (message: string, error?: any) => {
    if (process.env.NODE_ENV !== 'production') {
      console.error(`[WAGMI ERROR] ${message}`, error);
    }
  },
  warn: (message: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[WAGMI WARNING] ${message}`);
    }
  },
  info: (message: string) => {
    if (process.env.NODE_ENV !== 'production') {
      console.info(`[WAGMI INFO] ${message}`);
    }
  }
};

export const config = createConfig({
  chains: [baseSepolia, base],
  multiInjectedProviderDiscovery: false,
  connectors: [cbWalletConnector],
  ssr: true,
  transports: {
    [baseSepolia.id]: http({
      retryCount: 3,
      timeout: 15_000, // 15 seconds
      fetchOptions: {
        cache: 'no-store',
      },
    }),
    [base.id]: http({
      retryCount: 3,
      timeout: 15_000, // 15 seconds
      fetchOptions: {
        cache: 'no-store',
      },
    }),
  },
  // Enhanced error handling
  syncConnectedChain: true,
});

// Add custom typings for better TypeScript integration
declare module "wagmi" {
  interface Register {
    config: typeof config;
  }
}

// Export utility function to check if user has a smart wallet
export const isSmartWalletUser = (address?: string): boolean => {
  if (!address) return false;
  
  // This is a placeholder - in a real implementation, you would check
  // if the address is a smart contract or use Coinbase's API to verify
  // For now, we'll assume any address that starts with 0x1 is a smart wallet
  return address.startsWith('0x1');
}; 