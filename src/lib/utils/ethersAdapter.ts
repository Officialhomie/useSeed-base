import { ethers } from 'ethers'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import type { PublicClient, WalletClient } from 'viem'
// eslint-disable-next-line import/no-relative-parent-imports
import { config } from '../../../wagmi'

// Patch ethers default provider behavior to avoid localhost
function patchEthersDefaults() {
  // This is a bit of a hack but prevents ethers from trying to connect to localhost:8545
  // by replacing the JsonRpcProvider's defaultUrl method (which returns localhost:8545)
  const originalDefaultUrl = ethers.providers.JsonRpcProvider.defaultUrl;
  ethers.providers.JsonRpcProvider.defaultUrl = function() {
    // Instead of localhost:8545, return mainnet.base.org
    return 'https://mainnet.base.org';
  };
  
  console.log('Patched ethers defaults to avoid localhost connections');
}

// Run the patch immediately
patchEthersDefaults();

/**
 * Convert a wagmi PublicClient to an ethers.js Provider.
 */
export function publicClientToProvider(publicClient: PublicClient): ethers.providers.Provider {
  const { chain, transport } = publicClient as any
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: chain!.contracts?.ensRegistry?.address,
  }

  try {
    // 1. wagmi fallback transport → use all child transports to make an ethers FallbackProvider
    if ((transport as any)?.transports) {
      const urls = (transport as any).transports.map((t: any) => t.url)
      // Filter out any localhost URLs to prevent connection errors
      const validUrls = urls.filter((u: string) => !u.includes('localhost') && !u.includes('127.0.0.1'))
      
      if (validUrls.length > 0) {
        const providers = validUrls.map((u: string) => new ethers.providers.JsonRpcProvider(u, network))
        return new ethers.providers.FallbackProvider(providers, 1) // 1-of quorum
      } else {
        // If no valid URLs, use public Base RPC
        console.warn('No valid RPC URLs found in transports, using public Base RPC')
        return new ethers.providers.JsonRpcProvider('https://mainnet.base.org', network)
      }
    }

    // 2. single HTTP transport - avoid localhost
    if (transport.type === 'http') {
      if (transport.url && !transport.url.includes('localhost') && !transport.url.includes('127.0.0.1')) {
        return new ethers.providers.JsonRpcProvider(transport.url, network)
      } else {
        // Use public Base RPC instead of localhost
        console.warn('Avoiding localhost RPC, using public Base RPC')
        return new ethers.providers.JsonRpcProvider('https://mainnet.base.org', network)
      }
    }

    // 3. injected provider
    if (typeof window !== 'undefined' && (window as any).ethereum) {
      return new ethers.providers.Web3Provider((window as any).ethereum, network)
    }

    // 4. Last resort fallback - use public Base RPC
    console.warn('Using fallback public Base RPC')
    return new ethers.providers.JsonRpcProvider('https://mainnet.base.org', network)
  } catch (error) {
    // Ultimate fallback if everything else fails
    console.error('Provider creation error:', error)
    return new ethers.providers.JsonRpcProvider('https://mainnet.base.org', network)
  }
}

/**
 * Convert a wagmi WalletClient to an ethers.js Signer.
 */
export function walletClientToSigner(walletClient: WalletClient): ethers.Signer {
  const { account, chain } = walletClient as any
  const provider = publicClientToProvider(walletClient.transport.publicClient as PublicClient)
  const ethersProvider = provider instanceof ethers.providers.Web3Provider ? provider : new ethers.providers.Web3Provider(provider as any)
  return ethersProvider.getSigner(account!.address)
}

/**
 * Get an ethers.js Provider from the current wagmi public client.
 */
export async function getEthersProvider(): Promise<ethers.providers.Provider> {
  const publicClient = getPublicClient(config)
  return publicClientToProvider(publicClient as unknown as PublicClient)
}

/**
 * Get an ethers.js Signer associated with the connected wallet.
 * @param address Optional address override
 */
export async function getEthersSigner(address?: string): Promise<ethers.Signer> {
  const walletClient = await getWalletClient(config, { account: address as any })
  if (!walletClient) {
    throw new Error('Wallet not connected')
  }
  return walletClientToSigner(walletClient as unknown as WalletClient)
}

/**
 * Directly obtain a signer from window.ethereum (Coinbase Wallet).
 * Serves as a fallback if wagmi actions fail.
 */
export function getWindowSigner(): ethers.Signer {
  if (typeof window === 'undefined' || !(window as any).ethereum) {
    throw new Error('Ethereum provider not found')
  }
  const provider = new ethers.providers.Web3Provider((window as any).ethereum, 'any')
  return provider.getSigner()
} 