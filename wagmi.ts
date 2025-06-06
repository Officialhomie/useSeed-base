import { http, createConfig, fallback } from "wagmi";
import { base, baseSepolia } from "wagmi/chains";
import { coinbaseWallet, walletConnect, injected } from "wagmi/connectors";
import myLogo from '@/resources/download.jpeg'
import { useSwitchChain } from 'wagmi';

const { chains, switchChain } = useSwitchChain();


// Enhanced connector with better error handling and configuration
export const cbWalletConnector = coinbaseWallet({
  appName: "SpendSave Protocol",
  appLogoUrl: "/logo.png", // Optional logo URL
  preference: "all", // Allow all wallet types (EOA and Smart Wallets)
  chainId: base.id, // Default to Base mainnet
});

// WalletConnect connector
export const walletConnectConnector = walletConnect({
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID!, // You'll need to get this from WalletConnect Cloud
  metadata: {
    name: 'SpendSave Protocol',
    description: 'DeFi Savings Protocol on Base',
    url: typeof window !== 'undefined' ? window.location.origin : 'https://use-seed-base.vercel.app',
    icons: ['@/resources/download.jpeg']
  },
  showQrModal: true,
});

// Injected connector for MetaMask and other browser wallets
export const injectedConnector = injected({
  target: 'metaMask',
});

// Generic injected connector for other wallets
export const genericInjectedConnector = injected({
  target: () => ({
    id: 'injected',
    name: 'Browser Wallet',
    provider: typeof window !== 'undefined' ? window.ethereum : undefined,
  }),
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

// Helper to build RPC url from env keys
function buildAlchemyUrl(chain: 'base-sepolia' | 'base') {
  const key = chain === 'base-sepolia'
    ? process.env.NEXT_PUBLIC_ALCHEMY_BASE_SEPOLIA_KEY
    : process.env.NEXT_PUBLIC_ALCHEMY_BASE_KEY
  return key ? `https://base-${chain === 'base' ? 'mainnet' : 'sepolia'}.g.alchemy.com/v2/${key}` : null
}

function buildInfuraUrl(chain: 'base-sepolia' | 'base') {
  const key = chain === 'base-sepolia'
    ? process.env.NEXT_PUBLIC_INFURA_BASE_SEPOLIA_KEY
    : process.env.NEXT_PUBLIC_INFURA_BASE_KEY
  return key ? `https://${chain}.infura.io/v3/${key}` : null
}

// Configure multiple transports with fallback for Base Sepolia
// const baseSepoliaTransports = [
//   buildAlchemyUrl('base-sepolia') ? http(buildAlchemyUrl('base-sepolia')!, { timeout: 10000, fetchOptions: { mode: 'cors', cache: 'no-cache' } }) : null,
//   // buildInfuraUrl('base-sepolia') ? http(buildInfuraUrl('base-sepolia')!, { timeout: 10000, fetchOptions: { mode: 'cors', cache: 'no-cache' } }) : null,
  
//   // Check for custom RPC URL from env variable first
//   process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC ? http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC, { 
//     timeout: 12000,
//     fetchOptions: {
//       mode: 'cors',
//       cache: 'no-cache',
//     }
//   }) : null,
  
//   // Check for backup RPC URL if provided
//   process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_BACKUP ? http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_BACKUP, { 
//     timeout: 12000,
//     fetchOptions: {
//       mode: 'cors',
//       cache: 'no-cache',
//     }
//   }) : null,
  
//   // Additional RPC providers if configured
//   process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_QUICKNODE ? http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_QUICKNODE, { 
//     timeout: 12000,
//     fetchOptions: { mode: 'cors', cache: 'no-cache' },
//   }) : null,
  
//   process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_BLAST ? http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_BLAST, { 
//     timeout: 12000,
//     fetchOptions: { mode: 'cors', cache: 'no-cache' },
//   }) : null,
  
//   process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_NODEREAL ? http(process.env.NEXT_PUBLIC_BASE_SEPOLIA_RPC_NODEREAL, { 
//     timeout: 12000,
//     fetchOptions: { mode: 'cors', cache: 'no-cache' },
//   }) : null,
  
//   // Support for public gateway endpoints that have CORS enabled
//   http('https://sepolia.base.org', { 
//     timeout: 10000,
//     fetchOptions: {
//       mode: 'cors',
//       cache: 'no-cache',
//     }
//   }),
  
//   // Alternate node with longer timeout
//   http('https://base-sepolia-rpc.publicnode.com', { 
//     timeout: 15000,
//     fetchOptions: {
//       mode: 'cors',
//       cache: 'no-cache',
//     }
//   }),
  
//   // Tenderly gateway
//   http('https://base-sepolia.gateway.tenderly.co', {
//     timeout: 15000,
//     fetchOptions: { mode: 'cors', cache: 'no-cache' },
//   }),
  
//   // Local proxy option if direct access fails
//   http('/api/rpc/base-sepolia', { 
//     timeout: 8000,
//     fetchOptions: {
//       mode: 'same-origin',
//     }
//   })
// ].filter(Boolean) as ReturnType<typeof http>[]; // remove nulls if no key provided

// Main network transports (for future use)
const baseMainnetTransports = [
  buildAlchemyUrl('base') ? http(buildAlchemyUrl('base')!, { timeout: 10000, fetchOptions: { mode: 'cors', cache: 'no-cache' } }) : null,
  buildInfuraUrl('base') ? http(buildInfuraUrl('base')!, { timeout: 10000, fetchOptions: { mode: 'cors', cache: 'no-cache' } }) : null,
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
  }),
  // Local proxy option if direct access fails
  http('/api/rpc/base', { 
    timeout: 8000,
    fetchOptions: {
      mode: 'same-origin',
    }
  })
].filter(Boolean) as ReturnType<typeof http>[];

// Create the Wagmi config with our transports
export const config = createConfig({
  chains: [base], // Keep base first to prioritize it
  connectors: [
    cbWalletConnector,
    injectedConnector, // MetaMask
    genericInjectedConnector, // Other browser wallets
    walletConnectConnector, // WalletConnect
  ],
  transports: {
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