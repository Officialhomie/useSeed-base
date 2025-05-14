// SPDX-License-Identifier: MIT
// src/lib/gas/gasOracle.ts

import { ethers } from 'ethers'

/**
 * Fetch current gasPrice from the connected chain via eth_gasPrice.
 * Returned value is **wei** as bigint so callers can easily feed it
 * into ethers TransactionRequest.gasPrice (after wrapping in BigNumber).
 *
 * @param provider – ethers provider already pinned to Base-Sepolia (84532)
 */
export async function fetchOnChainGas(
  provider: ethers.providers.Provider,
): Promise<ethers.BigNumber> {
  return provider.getGasPrice() // returns BigNumber
}

/**
 * Fallback gas oracle using api.base.org (public) or a hard-coded default.
 * Value is **wei** as bigint.
 */
export async function fetchFallbackGas(): Promise<ethers.BigNumber> {
  try {
    const res = await fetch('https://api.base.org/v1/gas-prices')
    if (res.ok) {
      const json: any = await res.json()
      const gweiValue: number | undefined =
        json?.recommended ?? json?.fast ?? json?.standard
      if (typeof gweiValue === 'number' && gweiValue > 0) {
        return ethers.utils.parseUnits(gweiValue.toString(), 'gwei')
      }
    }
  } catch (_) {
    /* ignore – fall through to default */
  }

  // Hard default 30 gwei
  return ethers.utils.parseUnits('30', 'gwei')
} 