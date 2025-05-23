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
  Currency,
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
import { getSqrtPriceLimit } from './UniswapV4Integration'
import type { HookFlags } from './types'
import V4QuoterABI from '@/ABI/V4Quoter.json'
import PoolManagerAbi from '@/abi/core/PoolManager.json'
import { BaseScanClient } from '../basescan/BaseScanClient'

export interface QuoteResult {
  quoteType?: 'CONTRACT' | 'SDK' | 'SIMULATION' | 'DIRECT'
  amountIn?: string
  amountOut?: string
  sqrtPriceX96After?: string
  initializedTicksCrossed?: number
  gasEstimate?: string
  quote: CurrencyAmount<Token>
  route: Route<Token, Token>
  priceImpact: Percent
  trade: V4Trade<Token, Token, TradeType>
}

// Create a custom tick data provider to avoid "No tick data provider was given" error
class SimpleTickDataProvider {
  private ticks: Map<number, { liquidityNet: JSBI; liquidityGross: JSBI }> = new Map();
  private tickSpacing: number;
  private currentTick: number;

  constructor(currentTick: number, tickSpacing: number = 60) {
    this.currentTick = currentTick;
    this.tickSpacing = tickSpacing;
    
    // Initialize with minimal data for the current tick
    this.ticks.set(currentTick, {
      liquidityNet: JSBI.BigInt(0),
      liquidityGross: JSBI.BigInt(0)
    });
  }

  // Add a tick to our local cache
  public addTick(
    tick: number, 
    liquidityNet: JSBI, 
    liquidityGross: JSBI
  ): void {
    this.ticks.set(tick, { liquidityNet, liquidityGross });
  }

  // Add multiple ticks at once
  public addTicks(
    ticks: Array<{ index: number; liquidityNet: JSBI; liquidityGross: JSBI }>
  ): void {
    for (const tick of ticks) {
      this.addTick(tick.index, tick.liquidityNet, tick.liquidityGross);
    }
  }

  // Return liquidity information for a specific tick
  async getTick(
    tick: number
  ): Promise<{ liquidityNet: JSBI; liquidityGross: JSBI }> {
    // Check if we have the tick in our cache
    if (this.ticks.has(tick)) {
      return this.ticks.get(tick)!;
    }

    // For ticks not in our cache, return default values
    // In production, this would fetch from the blockchain
    return {
      liquidityNet: JSBI.BigInt(0),
      liquidityGross: JSBI.BigInt(0)
    };
  }

  // This function is required by the Pool class to find nearby initialized ticks
  async nextInitializedTickWithinOneWord(
    tick: number,
    lte: boolean,
    tickSpacing: number
  ): Promise<[number, boolean]> {
    // Calculate the normalized tick based on tick spacing
    const compressed = Math.floor(tick / tickSpacing) * tickSpacing;
    
    // If we want initialized ticks less than or equal to the given tick
    if (lte) {
      // First try to find the closest initialized tick at or below the compressed tick
      const ticksBelow = Array.from(this.ticks.keys())
        .filter(t => t <= compressed)
        .sort((a, b) => b - a);  // Sort in descending order
      
      if (ticksBelow.length > 0) {
        // Return the closest initialized tick at or below our tick
        return [ticksBelow[0], true];
      }
      
      // No initialized ticks below, return the compressed tick as a placeholder
      return [compressed, false];
    } else {
      // Find the closest initialized tick above the compressed tick
      const ticksAbove = Array.from(this.ticks.keys())
        .filter(t => t > compressed)
        .sort((a, b) => a - b);  // Sort in ascending order
      
      if (ticksAbove.length > 0) {
        // Return the closest initialized tick above our tick
        return [ticksAbove[0], true];
      }
      
      // No initialized ticks above, return the next spacing boundary
      return [compressed + tickSpacing, false];
    }
  }
}

export class UniswapV4Client {
  readonly provider: ethers.providers.Provider
  readonly signer?: ethers.Signer
  userAddress: string | null = null;
  private ethPriceInUsd: number = 2500; // Default ETH price, should be updated
  private baseScanClient: BaseScanClient;
  private isInitialized: boolean = false;
  private networkStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider
    this.signer = signer
    this.baseScanClient = new BaseScanClient();
    
    // Initialize network detection
    this.detectNetwork().catch(err => {
      console.warn('Network detection failed during construction:', err);
      this.networkStatus = 'disconnected';
    });
  }

  // Detect network and ensure we're on Base mainnet (chainId 8453)
  async detectNetwork(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      const chainId = network.chainId;
      
      if (chainId !== 8453) {
        console.warn(`Connected to network: ${network.name} (${chainId}). Please switch to Base mainnet (8453)`);
        this.networkStatus = 'connected';
      } else {
        console.log(`Connected to Base mainnet (${chainId})`);
        this.networkStatus = 'connected';
      }
    } catch (error) {
      console.error('Network detection error:', error);
      this.networkStatus = 'disconnected';
    }
  }

  /**
   * Initialize the client with user address for operations requiring user context
   */
  async init(userAddress?: string): Promise<void> {
    try {
      // First ensure network is available
      if (this.networkStatus !== 'connected') {
        try {
          await this.detectNetwork();
        } catch (networkErr) {
          console.error('Network detection failed during initialization');
          // Continue with initialization but flag the issue
        }
      }

      // Get ETH price from BaseScan API
      this.ethPriceInUsd = await this.getEthPrice();
      
      // Set user address
      if (userAddress) {
        this.userAddress = userAddress;
      } else if (this.signer) {
        this.userAddress = await this.signer.getAddress();
      }
      
      this.isInitialized = true;
    } catch (error) {
      console.error("Failed to initialize UniswapV4Client:", error);
      // Mark as initialized with error to prevent continuous retries
      this.isInitialized = true;
      throw error;
    }
  }

  /**
   * Get the current ETH price in USD
   */
  async getEthPrice(): Promise<number> {
    try {
      // Try to fetch from a public API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      if (data && data.ethereum && data.ethereum.usd) {
        return data.ethereum.usd;
      }
      
      // Fallback to a reasonable default
      return 2500;
    } catch (error) {
      console.warn('Error fetching ETH price, using default', error);
      // Return a reasonable hardcoded value if fetch fails
      return 2500;
    }
  }

  private getQuoterContract(): ethers.Contract {
    return new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_V4QUOTER,
      V4QuoterABI,
      this.provider
    );
  }

  /**
   * Helper to ensure tokens are proper instances
   */
  private enforceTokenInstance(token: any): Token {
    if (token instanceof Token) {
      return token;
    }
    
    // Handle different token formats
    if (typeof token === 'string') {
      // Assume it's an address
      const foundToken = Object.values(SUPPORTED_TOKENS).find(t => 
        (t as any).address?.toLowerCase() === token.toLowerCase()
      );
      
      if (foundToken && foundToken instanceof Token) {
        return foundToken as Token;
      }
      
      // Create default token
      return new Token(
        CHAIN_ID,
        token as string,
        18,
        'UNKNOWN',
        'Unknown Token'
      );
    }
    
    // Handle token-like objects
    if (token.address) {
      return new Token(
        CHAIN_ID,
        token.address,
        token.decimals || 18,
        token.symbol || 'UNKNOWN',
        token.name || 'Unknown Token'
      );
    }
    
    throw new Error('Invalid token format');
  }

  /**
   * Sort tokens by address
   */
  private sortTokens(tokenA: Token, tokenB: Token): [Token, Token] {
    return tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  }

  /**
   * Debug helper to check token instances
   */
  private logTokenDetails(token: any, label: string) {
    console.log(`${label} token details:`, {
      address: token.address,
      decimals: token.decimals,
      symbol: token.symbol,
      isToken: token instanceof Token,
      hasEquals: typeof token.equals === 'function'
    });
    
    if (token instanceof Token) {
      try {
        // Test the equals method
        const sameToken = new Token(
          CHAIN_ID,
          token.address,
          token.decimals,
          token.symbol || 'TEST',
          token.name || 'Test Token'
        );
        console.log(`${label} equals test:`, token.equals(sameToken));
      } catch (error) {
        console.error(`${label} equals test failed:`, error);
      }
    }
  }

  /**
   * Helper to create a proper trade object without type errors
   */
  private createProperTrade(
    route: Route<Token, Token>,
    inputAmount: CurrencyAmount<Token>,
    outputAmount: CurrencyAmount<Token>,
    tradeType: TradeType
  ): V4Trade<Token, Token, TradeType> {
    // Use the unchecked trade creation to avoid validation errors
    return V4Trade.createUncheckedTrade({
      route,
      inputAmount,
      outputAmount,
      tradeType
    }) as V4Trade<Token, Token, TradeType>;
  }

  /**
   * Call the V4Quoter contract and format the result
   */
  private async getQuoteFromContract(
    inputToken: Token,
    outputToken: Token,
    amountRaw: string,
    feeAmount: number = 3000
  ): Promise<QuoteResult> {
    try {
      console.debug('Getting quote from V4 Quoter contract');
      
      // Create ethers contract instance
      const quoterContract = new ethers.Contract(
        CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_V4QUOTER,
        V4QuoterABI,
        this.provider
      );
      
      // Parse amount with proper decimals
      const inputDecimals = inputToken.decimals; 
      const amountIn = ethers.utils.parseUnits(amountRaw, inputDecimals);
      
      // Format parameters for the quoter call exactly as expected
      const params = {
        tokenIn: inputToken.address,
        tokenOut: outputToken.address,
        amountIn: amountIn.toString(),
        fee: feeAmount,
        sqrtPriceLimitX96: 0
      };
      
      // Call quoter contract with properly typed parameters
      const quoteResult = await quoterContract.callStatic.quoteExactInputSingle(
        params.tokenIn,
        params.tokenOut,
        params.fee,
        params.amountIn,
        params.sqrtPriceLimitX96
      );
      
      // Parse the result - handling BigNumber conversion properly
      const amountOut = ethers.utils.formatUnits(
        quoteResult.amountOut || quoteResult,
        outputToken.decimals
      );
      
      // Fetch pool data for routing information
      const pool = await this.fetchPoolData(inputToken, outputToken, feeAmount);
      
      // Create a proper route with correct token ordering
      // Ensure token0 and token1 are properly assigned
      const route = new Route(
        [pool],
        inputToken,
        outputToken
      ) as Route<Token, Token>;
      
      // Calculate price impact using midPrice
      const priceImpact = new Percent('50', '10000'); // Default 0.5%
      
      // Create a properly typed trade object
      const quote = CurrencyAmount.fromRawAmount(
        outputToken,
        ethers.utils.parseUnits(amountOut, outputToken.decimals).toString()
      );
      
      const trade = this.createProperTrade(
        route,
        CurrencyAmount.fromRawAmount(
          inputToken,
          amountIn.toString()
        ),
        quote,
        TradeType.EXACT_INPUT
      );

      return {
        quoteType: 'CONTRACT',
        amountIn: amountRaw,
        amountOut,
        quote,
        route,
        priceImpact,
        trade
      };
    } catch (error) {
      console.error('Error in getQuoteFromContract:', error);
      throw error; // Let the caller handle the error
    }
  }

  /**
   * Add a helper function to ensure we're always working with token instances
   */
  private ensureTokenAmount(amount: CurrencyAmount<Currency>): CurrencyAmount<Token> {
    const currency = amount.currency;
    
    // If it's already a Token, we can just cast it
    if (currency instanceof Token) {
      return amount as CurrencyAmount<Token>;
    }
    
    // If it's a native currency like ETH, we need to convert to WETH
    const wethToken = SUPPORTED_TOKENS.WETH as Token;
    return CurrencyAmount.fromRawAmount(
      wethToken,
      amount.quotient.toString()
    );
  }

  /**
   * Fix the direct quote implementation to use our helper
   */
  private async getDirectWethEthQuote(
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    amountRaw: string
  ): Promise<QuoteResult> {
    // Use only Token instances, converting any ETH to WETH for type safety
    const weth = SUPPORTED_TOKENS.WETH as Token;
    
    // Handle input token (always use WETH even for ETH input)
    const inputToken = fromToken === 'ETH' ? weth : this.enforceTokenInstance(SUPPORTED_TOKENS[fromToken]);
    
    // Handle output token (always use WETH even for ETH output)
    const outputToken = toToken === 'ETH' ? weth : this.enforceTokenInstance(SUPPORTED_TOKENS[toToken]);
    
    // For WETH/ETH the rate is always 1:1
    const rawAmount = ethers.utils.parseUnits(amountRaw, inputToken.decimals).toString();
    
    // Create properly typed CurrencyAmount objects
    const amountIn = CurrencyAmount.fromRawAmount(inputToken, rawAmount);
    const amountOut = CurrencyAmount.fromRawAmount(outputToken, rawAmount);
    
    // Create dummy pool for the route
    const pool = await this.fetchPoolData(inputToken, outputToken);
    
    // Create route and trade with proper typing
    const route = new Route([pool], inputToken, outputToken) as Route<Token, Token>;
    const trade = this.createProperTrade(
      route,
      amountIn,
      amountOut,
      TradeType.EXACT_INPUT
    );
    
    return {
      quoteType: 'DIRECT',
      amountIn: amountRaw,
      amountOut: amountRaw, // 1:1 for ETH/WETH
      quote: amountOut,
      route,
      priceImpact: new Percent('0', '10000'), // 0% price impact for ETH/WETH
      trade
    };
  }

  /**
   * Fetches pool data in a reliable way - handles token type consistency
   */
  async fetchPoolData(
    inputToken: Token,
    outputToken: Token,
    fee: number = 3000
  ): Promise<Pool> {
    try {
      // First check network status before attempting network calls
      if (this.networkStatus === 'disconnected') {
        console.warn('Network is disconnected, using fallback pool data');
        return this.createFallbackPool(inputToken, outputToken, fee);
      }

      try {
        // Re-detect network if status is unknown
        if (this.networkStatus !== 'connected') {
          await this.detectNetwork();
        }
        
        // Sort the tokens
        const [token0, token1] = this.sortTokens(inputToken, outputToken);
        
        // Create tick data provider
        const tickDataProvider = new SimpleTickDataProvider(0, 60);
        
        // Use standard tick spacing for fee
        let tickSpacing = 60; // Default for 0.3% pools
        if (fee === 500) tickSpacing = 10;
        if (fee === 100) tickSpacing = 1;
        if (fee === 10000) tickSpacing = 200;
        
        // Debug
        this.logTokenDetails(token0, 'Token0');
        this.logTokenDetails(token1, 'Token1');
        
        // Get pool state for initializing the pool
        const quoterContract = this.getQuoterContract();
        
        const poolParams = await quoterContract.getPoolState(
          token0.address,
          token1.address,
          fee,
          CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
        );
        
        // Default for 0.3% pools
        
        // Create pool with all required parameters
        return new Pool(
          token0,
          token1,
          fee,
          tickSpacing,
          CONTRACT_ADDRESSES.SPEND_SAVE_HOOK, // Using your hook as hook
          poolParams.sqrtPriceX96.toString(),
          poolParams.liquidity.toString(),
          poolParams.tick,
          tickDataProvider
        );
      } catch (error) {
        console.warn('Error fetching on-chain pool data:', error);
        
        if (error instanceof Error && 
            (error.message.includes('PRICE_BOUNDS') || 
             error.message.includes('noNetwork') ||
             error.message.includes('network disconnected'))) {
          // More specific error handling for price bounds issues
          console.warn('Price bounds or network error, using safe defaults');
          return this.createFallbackPool(inputToken, outputToken, fee);
        }
        
        // For other errors, still try to create a default pool
        return this.createFallbackPool(inputToken, outputToken, fee);
      }
    } catch (error) {
      console.error('Error in fetchPoolData:', error);
      // Final fallback with very safe defaults
      return this.createFallbackPool(inputToken, outputToken, fee);
    }
  }
  
  /**
   * Create a fallback pool with safe default values
   */
  private createFallbackPool(inputToken: Token, outputToken: Token, fee: number): Pool {
    try {
      // Sort tokens correctly
      const [token0, token1] = this.sortTokens(inputToken, outputToken);
      
      // Create a simple tick data provider
      const tickDataProvider = new SimpleTickDataProvider(0, 60);
      
      // Use standard tick spacing for fee
      let tickSpacing = 60; // Default for 0.3% pools
      if (fee === 500) tickSpacing = 10;
      if (fee === 100) tickSpacing = 1;
      if (fee === 10000) tickSpacing = 200;
      
      // Use token symbols to determine a reasonable default price
      let sqrtPriceX96 = '1'; // Default
      
      // Try to use token symbols to make better fallback price estimates
      if ((token0.symbol === 'WETH' || token0.symbol === 'ETH') && token1.symbol === 'USDC') {
        // ~$2500 ETH price
        sqrtPriceX96 = '1517882343751509868544'
      } else if (token0.symbol === 'USDC' && (token1.symbol === 'WETH' || token1.symbol === 'ETH')) {
        // Inverse of above
        sqrtPriceX96 = '658641163350';
      } else if (token0.symbol === 'WETH' && token1.symbol === 'ETH') {
        // 1:1 ratio for WETH:ETH
        sqrtPriceX96 = '79228162514264337593543950336';
      }
      
      // Create default pool with all required parameters
      return new Pool(
        token0,
        token1,
        fee,
        tickSpacing,
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK, // Using your hook as hook
        sqrtPriceX96,
        '1000000', // Default liquidity - a bit higher than 1
        0,        // Default tick
        tickDataProvider
      );
    } catch (fallbackError) {
      console.error('Error creating fallback pool:', fallbackError);
      
      // Ultimate fallback - very basic pool with minimal parameters
      const [token0, token1] = this.sortTokens(inputToken, outputToken);
      const tickDataProvider = new SimpleTickDataProvider(0, 60);
      
      return new Pool(
        token0,
        token1,
        fee,
        60,
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        '1',
        '1',
        0,
        tickDataProvider
      );
    }
  }

  /**
   * Get a quote using the SDK simulation method
   */
  async getQuoteFromSdk(
    amountIn: CurrencyAmount<Token>,
    outputToken: Token,
    hookData: string = '0x',
    feeAmount: number = 3000
  ): Promise<QuoteResult> {
    try {
      console.debug('Getting quote from SDK simulation')
      const inputToken = amountIn.currency as Token;
      
      // Ensure both tokens are proper instances
      const tokenA = this.enforceTokenInstance(inputToken);
      const tokenB = this.enforceTokenInstance(outputToken);
      
      // Get pool data with proper typing
      const pool = await this.fetchPoolData(tokenA, tokenB, feeAmount);
      
      // Create a route with tokens in the correct order
      const route = new Route([pool], tokenA, tokenB) as Route<Token, Token>;
      
      // Calculate the output amount using the pool's getOutputAmount method
      let outputAmount: CurrencyAmount<Token>;
      try {
        const [amount] = await pool.getOutputAmount(amountIn);
        outputAmount = amount as CurrencyAmount<Token>;
      } catch (error) {
        console.warn('Error using pool.getOutputAmount, falling back to price calculation', error);
        
        // Fallback calculation if getOutputAmount fails
        const midPrice = route.midPrice;
        const rawInputAmount = JSBI.BigInt(amountIn.quotient.toString());
        const outputDecimals = tokenB.decimals;
        
        // Convert input to output using the price
        const priceScalingFactor = JSBI.exponentiate(
          JSBI.BigInt(10),
          JSBI.BigInt(outputDecimals)
        );
        
        // Calculate the raw output amount
        const rawOutputAmount = JSBI.divide(
          JSBI.multiply(
            rawInputAmount,
            JSBI.BigInt(Math.floor(Number(midPrice.toSignificant(18)) * 10000))
          ),
          JSBI.BigInt(10000)
        );
        
        // Create the output amount
        outputAmount = CurrencyAmount.fromRawAmount(
          tokenB,
          rawOutputAmount.toString()
        );
      }
      
      // Create a proper trade object
      const trade = this.createProperTrade(
        route,
        amountIn,
        outputAmount,
        TradeType.EXACT_INPUT
      );
      
      // Calculate a rough price impact - use fixed 0.5% as default
      const priceImpact = new Percent('50', '10000');
      
      return {
        quoteType: 'SDK',
        quote: outputAmount,
        route,
        priceImpact,
        trade
      };
    } catch (error) {
      console.error('Error in getQuoteFromSdk:', error);
      throw error;
    }
  }

  /**
   * Get a quote for a swap with prioritized methods
   */
  async getQuote(
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    amountRaw: string,
    hookFlags?: HookFlags,
    savingsPath?: SupportedTokenSymbol[]
  ): Promise<QuoteResult> {
    try {
      // First check network connection
      if (this.networkStatus === 'disconnected') {
        try {
          await this.detectNetwork();
        } catch (netErr) {
          console.warn('Network disconnected during quote, using fallback');
          return this.getFallbackQuoteForPair(fromToken, toToken, amountRaw);
        }
      }

      // Special optimized path for ETH-WETH swaps which are 1:1
      if ((fromToken === 'ETH' && toToken === 'WETH') || 
          (fromToken === 'WETH' && toToken === 'ETH')) {
        return this.getDirectWethEthQuote(fromToken, toToken, amountRaw);
      }

      // Get token instances
      const inputToken = this.enforceTokenInstance(SUPPORTED_TOKENS[fromToken]);
      const outputToken = this.enforceTokenInstance(SUPPORTED_TOKENS[toToken]);
      
      // Parse amount with proper decimals
      const amountIn = CurrencyAmount.fromRawAmount(
        inputToken,
        JSBI.BigInt(ethers.utils.parseUnits(amountRaw, inputToken.decimals).toString())
      ) as CurrencyAmount<Token>;

      // Generate hook data if needed
      let hookData = '0x';
      if (hookFlags && !savingsPath) {
        // Simple hook flags without savings path
        hookData = encodeSpendSaveHookData({
          before: hookFlags.before,
          after: hookFlags.after,
          delta: hookFlags.delta
        });
      } else if (savingsPath && savingsPath.length > 0) {
        // We have a savings path, encode it properly
        const savingsToken = savingsPath[savingsPath.length - 1]; // Last token in path
        const savingsTokenAddress = SUPPORTED_TOKENS[savingsToken].address;
        
        hookData = encodeSpendSaveHookData({
          before: hookFlags?.before || true,
          after: hookFlags?.after || false,
          delta: hookFlags?.delta || false,
          path: [savingsTokenAddress]
        });
      }

      try {
        // Use contract-based quoter first
        return await this.getQuoteFromContract(inputToken, outputToken, amountRaw);
      } catch (contractErr) {
        console.warn('Contract quote failed, falling back to SDK quote:', contractErr);
        
        try {
          // Fall back to SDK-based quote
          return await this.getQuoteFromSdk(amountIn, outputToken, hookData);
        } catch (sdkErr) {
          console.warn('SDK quote failed, trying direct pair estimation:', sdkErr);
          
          // Third fallback - for common pairs, use direct estimation
          return this.getFallbackQuoteForPair(fromToken, toToken, amountRaw);
        }
      }
    } catch (error) {
      console.error('Quote error:', error);
      // Last resort fallback
      return this.getFallbackQuoteForPair(fromToken, toToken, amountRaw);
    }
  }
  
  /**
   * Get a fallback quote for common token pairs
   */
  private getFallbackQuoteForPair(
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    amountRaw: string
  ): Promise<QuoteResult> {
    console.info(`Using fallback price estimate for ${fromToken}-${toToken}`);
    
    // Properly ensure we have token instances
    const tokenA = this.enforceTokenInstance(SUPPORTED_TOKENS[fromToken]);
    const tokenB = this.enforceTokenInstance(SUPPORTED_TOKENS[toToken]);
    
    // Create token amounts
    const amountIn = CurrencyAmount.fromRawAmount(
      tokenA,
      JSBI.BigInt(ethers.utils.parseUnits(amountRaw, tokenA.decimals).toString())
    ) as CurrencyAmount<Token>;
    
    // Get fallback output amount based on pair
    let outputRaw = '0';
    const inputFloat = parseFloat(amountRaw);
    
    // Handle common pairs with rough price estimates
    if (fromToken === 'ETH') {
      if (toToken === 'WETH') {
        // 1:1 for ETH:WETH
        outputRaw = amountRaw;
      } else if (toToken === 'USDC') {
        // ~$2500 per ETH (simplified)
        outputRaw = (inputFloat * 2500).toFixed(6);
      }
    } else if (fromToken === 'WETH') {
      if (toToken === 'ETH') {
        // 1:1 for WETH:ETH
        outputRaw = amountRaw;
      } else if (toToken === 'USDC') {
        // ~$2500 per WETH
        outputRaw = (inputFloat * 2500).toFixed(6);
      }
    } else if (fromToken === 'USDC') {
      if (toToken === 'ETH' || toToken === 'WETH') {
        // ~$2500 per ETH (inverse)
        outputRaw = (inputFloat / 2500).toFixed(18);
      }
    }
    
    // Create output amount
    const outputAmount = CurrencyAmount.fromRawAmount(
      tokenB,
      JSBI.BigInt(ethers.utils.parseUnits(outputRaw, tokenB.decimals).toString())
    ) as CurrencyAmount<Token>;
    
    // Create fallback route and pool
    const pool = this.createFallbackPool(tokenA, tokenB, 3000);
    const route = new Route([pool], tokenA, tokenB);
    
    // Create trade
    const trade = this.createProperTrade(
      route,
      amountIn,
      outputAmount,
      TradeType.EXACT_INPUT
    );
    
    // Return a quote result
    return Promise.resolve({
      quoteType: 'SIMULATION',
      amountIn: amountIn.toExact(),
      amountOut: outputAmount.toExact(),
      quote: outputAmount,
      route,
      priceImpact: new Percent(JSBI.BigInt(0), JSBI.BigInt(10000)),
      trade
    });
  }

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

    const {
      fromToken,
      toToken,
      amountRaw,
      slippageBps = 50, // Default to 0.5%
      deadlineSeconds = 1200, // Default to 20 minutes
      gasOverrideGwei,
      hookFlags,
      savingsPath,
      disableSavings = false,
    } = params

    // Get tokens
    const tokenA = SUPPORTED_TOKENS[fromToken] as Token
    const tokenB = SUPPORTED_TOKENS[toToken] as Token

    // Parse amount
    const amountInRaw = ethers.utils.parseUnits(
      amountRaw,
      tokenA.decimals
    ).toString()

    // Fallback to ETH if needed
    if (!this.userAddress && this.signer) {
      this.userAddress = await this.signer.getAddress()
    }

    if (!this.userAddress) {
      throw new Error('User address not available')
    }

    // const planner = new V4Planner()
    // let route: Route<Token, Token>
    // let trade: V4Trade<Token, Token, TradeType>

    // if (savingsPath && savingsPath.length > 1) {
    //   const { buildSavingsConversionRoute } = await import('./routeBuilder')
    //   route = await buildSavingsConversionRoute(this, savingsPath)

    //   const firstToken = SUPPORTED_TOKENS[savingsPath[0]] as Token
    //   const amountInForRoute = CurrencyAmount.fromRawAmount(
    //     firstToken,
    //     ethers.utils.parseUnits(amountRaw, firstToken.decimals).toString(),
    //   )
    //   trade = await V4Trade.fromRoute(route, amountInForRoute, TradeType.EXACT_INPUT as TradeType)
    // } else if (savingsPath && savingsPath.length === 1) {
    //   ;({ route, trade } = await this.getQuote(savingsPath[0], toToken, amountRaw))
    // } else {
    //   ;({ route, trade } = await this.getQuote(fromToken, toToken, amountRaw))
    // }

    // // Create amount in for the trade parameters
    // const amountIn = CurrencyAmount.fromRawAmount(
    //   tokenA,
    //   amountInRaw
    // )

    // // Encode hook data with spender address
    // const hookData = encodeSpendSaveHookData(this.userAddress as `0x${string}`)

    // // Determine hook flags – if disableSavings => turn everything off
    // const finalHookFlags: HookFlags = disableSavings
    //   ? { before: false, after: false, delta: false }
    //   : { before: hookFlags?.before ?? true, after: hookFlags?.after ?? true, delta: hookFlags?.delta ?? true }

    // const zeroForOne = tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
    // const sqrtLimit = getSqrtPriceLimit(zeroForOne, slippageBps / 100)
    const valueToSend = fromToken === 'ETH' ? ethers.utils.parseUnits(amountRaw, 18) : ethers.BigNumber.from(0);

    // Create PoolManager contract instance instead of V4Planner
    const poolManagerContract = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_MANAGER,
      PoolManagerAbi,
      this.signer
    );

    // Create hook-enabled pool key (CRITICAL: Must include hook address)
    const [token0, token1] = tokenA.address.toLowerCase() < tokenB.address.toLowerCase() 
      ? [tokenA.address, tokenB.address] 
      : [tokenB.address, tokenA.address];
    
    const poolKey = {
      currency0: token0,
      currency1: token1,
      fee: 3000, // 0.3% fee
      tickSpacing: 60, // Standard tick spacing for 0.3% pools
      hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
    };

    // Create SwapParams structure
    const zeroForOne = tokenA.address.toLowerCase() < tokenB.address.toLowerCase();
    const sqrtLimit = getSqrtPriceLimit(zeroForOne, slippageBps / 100);
    
    const swapParams = {
      zeroForOne: zeroForOne,
      amountSpecified: `-${amountInRaw}`, // Negative for exact input
      sqrtPriceLimitX96: sqrtLimit.toString()
    };


    // Properly encode user address in hookData using ABI encoding
    const hookData = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [this.userAddress]
    );

    console.log('PHASE 1: Direct PoolManager.swap call', {
      poolKey,
      swapParams,
      hookData,
      valueToSend: valueToSend.toString()
    });

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


    try {
      const tx = await poolManagerContract.swap(
        poolKey,
        swapParams, 
        hookData,
        {
          value: valueToSend,
          gasPrice,
          gasLimit
        }
      );
      
      console.log('✅ PHASE 1 SUCCESS: Direct PoolManager.swap transaction sent:', tx.hash);
      console.log('Hook will automatically execute beforeSwap and afterSwap');      return tx;
    } catch (error) {
      console.error('Swap execution error:', error)
      throw error
    }
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

  /**
   * Get prices of all supported tokens in USD
   * Returns current prices and API status information
   */
  async getTokenPrices(): Promise<{
    prices: Record<SupportedTokenSymbol, { price: number, status: string }>;
    apiStatus: { 
      isOperational: boolean;
      lastUpdated: Date;
      fallbackUsed: boolean;
    };
  }> {
    try {
      // Initialize the result object
      const result: Record<SupportedTokenSymbol, { price: number, status: string }> = {
        ETH: { price: 0, status: 'loading' },
        WETH: { price: 0, status: 'loading' },
        USDC: { price: 1, status: 'stable' },
      };
      
      // API status tracking
      let isOperational = true;
      let fallbackUsed = false;
      
      // Get ETH price first, will be used for other calculations
      try {
        // Try to get from BaseScan API
        const ethPrice = await this.baseScanClient.getEthPrice();
        result.ETH = { price: ethPrice, status: 'success' };
        result.WETH = { price: ethPrice, status: 'success' }; // WETH has same price as ETH
      } catch (error) {
        console.warn('Failed to get ETH price from BaseScan API, using fallback:', error);
        // Use fallback price for ETH
        const fallbackEthPrice = 2500;
        result.ETH = { price: fallbackEthPrice, status: 'fallback' };
        result.WETH = { price: fallbackEthPrice, status: 'fallback' };
        isOperational = false;
        fallbackUsed = true;
      }
      
      // Return prices and API status
      return {
        prices: result,
        apiStatus: {
          isOperational,
          lastUpdated: new Date(),
          fallbackUsed
        }
      };
    } catch (error) {
      console.error("Error in getTokenPrices:", error);
      // In case of complete failure, return fallback values for everything
      return {
        prices: {
          ETH: { price: 2500, status: 'error' },
          WETH: { price: 2500, status: 'error' },
          USDC: { price: 1, status: 'stable' },
        },
        apiStatus: {
          isOperational: false,
          lastUpdated: new Date(),
          fallbackUsed: true
        }
      };
    }
  }
} 