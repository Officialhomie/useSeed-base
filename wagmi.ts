import { http, createConfig } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet } from "wagmi/connectors";

// Enhanced connector with better error handling and configuration
export const cbWalletConnector = coinbaseWallet({
  appName: "SpendSave Protocol",
  appLogoUrl: "/logo.png", // Optional logo URL
  preference: "all", // Allow all wallet types (EOA and Smart Wallets)
  chainId: baseSepolia.id, // Default chain ID
});

// Configure debugger for development
function setupDebugger() {
  if (typeof window !== 'undefined' && process.env.NODE_ENV !== 'production') {
    // Add listener for wallet connection events
    window.addEventListener('wallet-connection-error', (event) => {
      console.error('[Wallet Connection Error]', (event as CustomEvent).detail);
    });
  }
}

// Call setup function
setupDebugger();

// Properly configure transports for each chain
export const config = createConfig({
  chains: [baseSepolia, base],
  multiInjectedProviderDiscovery: true, // Discover all providers
  connectors: [cbWalletConnector],
  ssr: true,
  transports: {
    [baseSepolia.id]: http(`https://base-sepolia-rpc.publicnode.com`, {
      retryCount: 5,
      retryDelay: 1500, // Fixed retry delay of 1.5 seconds
      timeout: 15000,
      fetchOptions: {
        cache: 'no-store',
        credentials: 'omit',
        priority: 'high',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }),
    [base.id]: http(`https://base-mainnet-rpc.publicnode.com`, {
      retryCount: 3,
      retryDelay: 1000,
      timeout: 30000,
      fetchOptions: {
        cache: 'no-store',
        credentials: 'omit',
        headers: {
          'Content-Type': 'application/json',
        },
      },
    }),
  },
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