import { ethers } from 'ethers'
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
    if (address) {
      this.userAddress = address
    } else if (this.signer) {
      this.userAddress = await this.signer.getAddress()
    }
  }

  /**
   * Fetch on-chain pool data (liquidity, tick, etc.)
   */
  // eslint-disable-next-line @typescript-eslint/ban-ts-comment
  // @ts-ignore
  async fetchPoolData(tokenA: Token, tokenB: Token, fee = 500): Promise<Pool> {
    return (Pool as any).fetchData({
      tokenA,
      tokenB,
      fee,
      hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
      provider: this.provider,
    })
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
    // @ts-ignore
    const trade = await V4Trade.fromRoute(route, amountIn, TradeType.EXACT_INPUT)

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
  }): Promise<ethers.providers.TransactionResponse> {
    if (!this.signer) throw new Error('Signer not initialised')
    if (!this.userAddress) this.userAddress = await this.signer.getAddress()

    const { fromToken, toToken, amountRaw, slippageBps = 50, deadlineSeconds = 900 } = params

    const tokenA = SUPPORTED_TOKENS[fromToken] as Token
    const tokenB = SUPPORTED_TOKENS[toToken] as Token

    // get quote & route
    const { route, trade } = await this.getSwapQuote(fromToken, toToken, amountRaw)

    const amountIn = CurrencyAmount.fromRawAmount(
      tokenA,
      ethers.utils.parseUnits(amountRaw, tokenA.decimals).toString(),
    )

    // Encode hook data with spender address
    const hookData = encodeSpendSaveHookData(this.userAddress as `0x${string}`)

    const planner = new V4Planner()
    // @ts-ignore
    const { to, data, value } = planner.swapCallParameters({
      route,
      tradeType: trade.tradeType,
      amount: amountIn.quotient.toString(),
      slippageTolerance: new Percent(slippageBps, 10_000),
      deadline: Math.floor(Date.now() / 1000) + deadlineSeconds,
      hookOptions: {
        beforeSwap: true,
        afterSwap: true,
        beforeSwapReturnsDelta: true,
        afterSwapReturnsDelta: true,
      },
      hookData,
    })

    const tx: ethers.providers.TransactionRequest = {
      to,
      data,
      value: fromToken === 'ETH' ? value : 0,
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