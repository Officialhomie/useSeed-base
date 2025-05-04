import { ethers } from 'ethers'
import { getPublicClient, getWalletClient } from 'wagmi/actions'
import type { PublicClient, WalletClient } from 'viem'
// eslint-disable-next-line import/no-relative-parent-imports
import { config } from '../../../wagmi'

/**
 * Convert a wagmi PublicClient to an ethers.js Provider.
 */
export function publicClientToProvider(publicClient: PublicClient): ethers.providers.JsonRpcProvider | ethers.providers.Web3Provider {
  const { chain, transport } = publicClient as any
  const network = {
    chainId: chain!.id,
    name: chain!.name,
    ensAddress: chain!.contracts?.ensRegistry?.address,
  }

  if (transport.type === 'http') {
    // JSON-RPC endpoint
    return new ethers.providers.JsonRpcProvider(transport.url, network)
  }

  // Fallback to window.ethereum (Coinbase Wallet injects provider here)
  if (typeof window !== 'undefined' && (window as any).ethereum) {
    return new ethers.providers.Web3Provider((window as any).ethereum, network)
  }

  throw new Error(`Unsupported wagmi transport type: ${transport.type}`)
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