import { http, createConfig, fallback } from "wagmi";
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

// Configure multiple transports with fallback for Base Sepolia
const baseSepoliaTransports = [
  // Support for public gateway endpoints that have CORS enabled
  http('https://sepolia.base.org', { 
    timeout: 10000,
    fetchOptions: {
      mode: 'cors',
      cache: 'no-cache',
    }
  }),
  // Alternate node with longer timeout
  http('https://base-sepolia-rpc.publicnode.com', { 
    timeout: 15000,
    fetchOptions: {
      mode: 'cors',
      cache: 'no-cache',
    }
  }),
  // Local proxy option if direct access fails
  http('/api/rpc/base-sepolia', { 
    timeout: 8000,
    fetchOptions: {
      mode: 'same-origin',
    }
  })
];

// Main network transports (for future use)
const baseMainnetTransports = [
  http('https://mainnet.base.org', {
    timeout: 10000,
    fetchOptions: {
      mode: 'cors',
      cache: 'no-cache',
    }
  }),
  http('https://base-mainnet-rpc.publicnode.com', {
    timeout: 15000,
    fetchOptions: {
      mode: 'cors',
      cache: 'no-cache',
    }
  })
];

// Create the Wagmi config with our transports
export const config = createConfig({
  chains: [baseSepolia, base],
  connectors: [
    cbWalletConnector,
  ],
  transports: {
    [baseSepolia.id]: fallback(baseSepoliaTransports),
    [base.id]: fallback(baseMainnetTransports)
  },
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