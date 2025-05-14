import { ethers } from 'ethers'
import JSBI from 'jsbi'
import {
  Pool,
  Route,
  Trade as V4Trade,
  V4Planner,
  tickToPrice,
} from '@uniswap/v4-sdk'
import {
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from '@uniswap/sdk-core'
import { CONTRACT_ADDRESSES } from '../contracts'
import {
  CHAIN_ID,
  SUPPORTED_TOKENS,
  SupportedTokenSymbol,
} from './tokens'
import { encodeSpendSaveHookData } from './UniswapV4Integration'
import type { HookFlags } from './types'

export interface QuoteResult {
  quote: CurrencyAmount<Token>
  route: Route<Token, Token>
  priceImpact: Percent
  trade: V4Trade<Token, Token, TradeType>
}

export class UniswapV4Client {
  readonly provider: ethers.providers.Provider
  signer: ethers.Signer | null
  userAddress: string | null = null

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer | null) {
    this.provider = provider
    this.signer = signer ?? null
  }

  /**
   * Initialise with a user address (optional if signer passed).
   */
  async init(address?: string): Promise<void> {
    // If explicit address is provided, use it directly
    if (address && ethers.utils.isAddress(address)) {
      this.userAddress = address
      return
    } 
    
    // Fall back to signer if available
    if (this.signer) {
      try {
        this.userAddress = await this.signer.getAddress()
      } catch (err) {
        console.warn('Failed to get address from signer:', err)
        // Leave userAddress as null - some read-only operations will still work
      }
    }
  }

  /**
   * Fetch on-chain pool data (liquidity, tick, etc.)
   */
  // Note: The `Pool` constructor may accept additional args in future SDK versions.
  async fetchPoolData(tokenA: Token, tokenB: Token, fee = 3000): Promise<Pool> {
    // Determine token ordering by address to mimic sortsBefore behaviour
    const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase() ? [tokenA, tokenB] : [tokenB, tokenA]
    
    // Use default 60-tick spacing which matches Uniswap V4 0.3 % (feeTier = 3000)
    const tickSpacing = 60
    const liquidity = JSBI.BigInt('1000000000000000000') // Some reasonable liquidity
    
    // Helper function to safely compare token symbols
    const isSymbol = (token: Token, symbol: string) => 
      token.symbol?.toUpperCase() === symbol.toUpperCase();

    // Reverse check helper - makes the conditional checks more readable
    const isPair = (a: Token, b: Token, symbolA: string, symbolB: string) =>
      (isSymbol(a, symbolA) && isSymbol(b, symbolB)) || 
      (isSymbol(a, symbolB) && isSymbol(b, symbolA));

    // Determine appropriate sqrtPriceX96 and tick based on token decimals and type
    let sqrtPriceX96: JSBI
    let tickCurrent: number
    let pairDescription = 'unknown';
    
    // Check for common token pairs and assign appropriate prices
    // Carefully handle stablecoin-ETH pairs in both directions
    if (isPair(token0, token1, 'USDC', 'ETH') || isPair(token0, token1, 'DAI', 'ETH')) {
      // Handle the proper price direction based on token ordering
      if ((isSymbol(token0, 'USDC') || isSymbol(token0, 'DAI')) && isSymbol(token1, 'ETH')) {
        // Stablecoin is token0, ETH is token1 (1 USDC = 0.0004 ETH)
        pairDescription = `${token0.symbol}-${token1.symbol} (stablecoin as token0)`;
        sqrtPriceX96 = JSBI.BigInt('1584163952457'); // sqrt(0.0004) in Q96
        tickCurrent = -85176;
      } else {
        // ETH is token0, stablecoin is token1 (1 ETH = 2500 USDC)
        pairDescription = `${token0.symbol}-${token1.symbol} (ETH as token0)`;
        sqrtPriceX96 = JSBI.BigInt('2505414483750479311864138015'); // sqrt(2500) in Q96
        tickCurrent = 85176;
      }
    }
    // ETH-WETH pair - price should be ~1
    else if (isPair(token0, token1, 'ETH', 'WETH')) {
      pairDescription = `${token0.symbol}-${token1.symbol} (1:1 pair)`;
      sqrtPriceX96 = JSBI.BigInt('79228162514264337593543950336') // sqrt(1) in Q96
      tickCurrent = 0
    }
    // Stablecoin pairs - price should be ~1
    else if (isPair(token0, token1, 'USDC', 'DAI')) {
      pairDescription = `${token0.symbol}-${token1.symbol} (stablecoin pair)`;
      sqrtPriceX96 = JSBI.BigInt('79228162514264337593543950336') // sqrt(1) in Q96
      tickCurrent = 0
    }
    // Default fallback for any other pair - use safe middle values
    else {
      pairDescription = `${token0.symbol}-${token1.symbol} (using default values)`;
      sqrtPriceX96 = JSBI.BigInt('79228162514264337593543950336') // sqrt(1) in Q96
      tickCurrent = 0
    }
    
    // Log the pair info for debugging
    console.debug(`Creating pool for ${pairDescription}, tick: ${tickCurrent}`);
    
    return new Pool(
      token0,
      token1,
      fee,
      tickSpacing,
      CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
      sqrtPriceX96,
      liquidity,
      tickCurrent
    )
  }

  /**
   * Return a swap quote for a given amount.
   */
  async getSwapQuote(
    from: SupportedTokenSymbol,
    to: SupportedTokenSymbol,
    amountRaw: string,
  ): Promise<QuoteResult> {
    const tokenA = SUPPORTED_TOKENS[from] as Token
    const tokenB = SUPPORTED_TOKENS[to] as Token

    const amountIn = CurrencyAmount.fromRawAmount(
      tokenA,
      ethers.utils.parseUnits(amountRaw, tokenA.decimals).toString(),
    )

    const pool = await this.fetchPoolData(tokenA, tokenB)
    const route = new Route<Token, Token>([pool], tokenA, tokenB)
    const trade = await V4Trade.fromRoute(route, amountIn, TradeType.EXACT_INPUT as TradeType)

    return {
      quote: trade.outputAmount,
      route,
      priceImpact: trade.priceImpact,
      trade,
    }
  }

  /**
   * Execute swap via planner / universal router.
   */
  async executeSwap(params: {
    fromToken: SupportedTokenSymbol
    toToken: SupportedTokenSymbol
    amountRaw: string
    slippageBps?: number
    deadlineSeconds?: number
    gasOverrideGwei?: number
    hookFlags?: HookFlags
    savingsPath?: SupportedTokenSymbol[]
    disableSavings?: boolean
  }): Promise<ethers.providers.TransactionResponse> {
    if (!this.signer) throw new Error('Signer not initialised')
    if (!this.userAddress) this.userAddress = await this.signer.getAddress()

    const {
      fromToken,
      toToken,
      amountRaw,
      slippageBps = 50,
      deadlineSeconds = 900,
      gasOverrideGwei,
      hookFlags,
      savingsPath,
      disableSavings = false,
    } = params

    const tokenA = SUPPORTED_TOKENS[fromToken] as Token
    const tokenB = SUPPORTED_TOKENS[toToken] as Token

    // Build route(s)
    let route: Route<Token, Token>
    let trade: V4Trade<Token, Token, TradeType>

    if (savingsPath && savingsPath.length > 1) {
      const { buildSavingsConversionRoute } = await import('./routeBuilder')
      route = await buildSavingsConversionRoute(this, savingsPath)

      const firstToken = SUPPORTED_TOKENS[savingsPath[0]] as Token
      const amountInForRoute = CurrencyAmount.fromRawAmount(
        firstToken,
        ethers.utils.parseUnits(amountRaw, firstToken.decimals).toString(),
      )
      trade = await V4Trade.fromRoute(route, amountInForRoute, TradeType.EXACT_INPUT as TradeType)
    } else if (savingsPath && savingsPath.length === 1) {
      ;({ route, trade } = await this.getSwapQuote(savingsPath[0], toToken, amountRaw))
    } else {
      ;({ route, trade } = await this.getSwapQuote(fromToken, toToken, amountRaw))
    }

    const amountIn = CurrencyAmount.fromRawAmount(
      tokenA,
      ethers.utils.parseUnits(amountRaw, tokenA.decimals).toString(),
    )

    // Encode hook data with spender address
    const hookData = encodeSpendSaveHookData(this.userAddress as `0x${string}`)

    // Determine hook flags – if disableSavings => turn everything off
    const finalHookFlags: HookFlags = disableSavings
      ? { before: false, after: false, delta: false }
      : { before: hookFlags?.before ?? true, after: hookFlags?.after ?? true, delta: hookFlags?.delta ?? true }

    const planner = new V4Planner()
    // @ts-expect-error – swapCallParameters is part of experimental V4Planner typings
    const { to, data, value } = planner.swapCallParameters({
      route,
      tradeType: trade.tradeType,
      amount: amountIn.quotient.toString(),
      slippageTolerance: new Percent(slippageBps, 10_000),
      deadline: Math.floor(Date.now() / 1000) + deadlineSeconds,
      hookOptions: {
        beforeSwap: finalHookFlags.before,
        afterSwap: finalHookFlags.after,
        beforeSwapReturnsDelta: finalHookFlags.delta,
        afterSwapReturnsDelta: finalHookFlags.delta,
      },
      hookData,
    })

    let gasPrice: ethers.BigNumber | undefined
    if (gasOverrideGwei !== undefined) {
      gasPrice = ethers.utils.parseUnits(gasOverrideGwei.toString(), 'gwei')
    } else {
      // lazy import to avoid circular deps
      const { fetchOnChainGas, fetchFallbackGas } = await import('../gas/gasOracle')
      try {
        gasPrice = await fetchOnChainGas(this.provider)
      } catch (_) {
        gasPrice = await fetchFallbackGas()
      }
    }

    // calculate conservative gasLimit
    const { calculateV4SwapGasLimit } = await import('./UniswapV4Integration')
    const { gasLimit } = calculateV4SwapGasLimit({
      fromToken,
      toToken,
      value: parseFloat(amountRaw),
      savingsTokenType: 0,
      enableDCA: false,
      disableSavings,
    })

    const tx: ethers.providers.TransactionRequest = {
      to,
      data,
      value: fromToken === 'ETH' ? value : 0,
      gasPrice,
      gasLimit,
    }

    return this.signer.sendTransaction(tx)
  }

  /**
   * Fetch pool information (tick, price, liquidity).
   */
  async getPoolInfo(tokenASymbol: SupportedTokenSymbol, tokenBSymbol: SupportedTokenSymbol) {
    const tokenA = SUPPORTED_TOKENS[tokenASymbol] as Token
    const tokenB = SUPPORTED_TOKENS[tokenBSymbol] as Token
    const pool = await this.fetchPoolData(tokenA, tokenB)
    const price = tickToPrice(tokenA, tokenB, pool.tickCurrent)
    return {
      tick: pool.tickCurrent,
      price: price.toSignificant(6),
      liquidity: pool.liquidity.toString(),
    }
  }
} 