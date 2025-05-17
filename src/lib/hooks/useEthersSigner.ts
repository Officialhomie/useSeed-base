import { useState, useCallback, useEffect } from 'react'
import { ethers } from 'ethers'
import { getEthersProvider, getEthersSigner, getWindowSigner } from '../utils/ethersAdapter'
import { useAccount } from 'wagmi'

interface UseEthersSignerResult {
  signer: ethers.Signer | null
  isLoading: boolean
  error: Error | null
  refreshSigner: () => Promise<void>
}

export function useEthersSigner(): UseEthersSignerResult {
  const { address, isConnected } = useAccount()
  const [signer, setSigner] = useState<ethers.Signer | null>(null)
  const [isLoading, setLoading] = useState(false)
  const [error, setError] = useState<Error | null>(null)

  const fetchSigner = useCallback(async () => {
    if (!isConnected) {
      setSigner(null)
      return
    }
    setLoading(true)
    setError(null)
    try {
      let s: ethers.Signer
      try {
        s = await getEthersSigner(address)
      } catch (e) {
        // fallback
        s = getWindowSigner()
      }
      setSigner(s)
    } catch (e) {
      setError(e as Error)
    } finally {
      setLoading(false)
    }
  }, [address, isConnected])

  // Use useEffect to lazy load signer when component mounts and dependencies change
  useEffect(() => {
    if (signer === null && !isLoading && isConnected) {
      // eslint-disable-next-line @typescript-eslint/no-floating-promises
      fetchSigner()
    }
  }, [signer, isLoading, isConnected, fetchSigner])

  return {
    signer,
    isLoading,
    error,
    refreshSigner: fetchSigner,
  }
} 