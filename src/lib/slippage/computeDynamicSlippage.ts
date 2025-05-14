// SPDX-License-Identifier: MIT
// src/lib/slippage/computeDynamicSlippage.ts

/**
 * Compute a recommended slippage tolerance (basis points) based on
 * current route complexity and price impact.
 *
 * Logic (simple v1):
 *   recommended = max(priceImpactBps * 2, 30)
 *   cap at 500 bps.
 */
export function computeDynamicSlippage(
  priceImpactBps: number,
): number {
  const min = 30
  const max = 500
  const suggested = Math.max(priceImpactBps * 2, min)
  return Math.min(suggested, max)
} 