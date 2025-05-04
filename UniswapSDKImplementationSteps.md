# Uniswap v4 SDK Implementation Steps

After analyzing your codebase, I've identified the specific files that need modifications to implement the Uniswap v4 SDK integration. Here's a detailed implementation plan:

## 1. Install Required Dependencies

Add the Uniswap v4 SDK packages to your project:

```bash
npm install --save @uniswap/v4-sdk @uniswap/sdk-core ethers@5.7.2
```

## 2. Update Tokens Configuration

File: `src/lib/uniswap/tokens.ts`

This file already has token definitions but needs to be updated to fully leverage the SDK:

```typescript
import { Token, NativeCurrency, Ether } from '@uniswap/sdk-core'
import { CONTRACT_ADDRESSES } from '../contracts'

// Chain ID for Base Sepolia
export const CHAIN_ID = 84532

// Create Base Sepolia ETH as a native currency
export const NATIVE_ETH = Ether.onChain(CHAIN_ID)

// Token Instances using Uniswap SDK
export const WETH = new Token(
  CHAIN_ID,
  CONTRACT_ADDRESSES.WETH,
  18,
  'WETH',
  'Wrapped Ether'
)

export const USDC = new Token(
  CHAIN_ID,
  CONTRACT_ADDRESSES.USDC,
  6,
  'USDC',
  'USD Coin'
)

export const DAI = new Token(
  CHAIN_ID,
  CONTRACT_ADDRESSES.DAI,
  18,
  'DAI',
  'Dai Stablecoin'
)

// All supported tokens
export const SUPPORTED_TOKENS = {
  ETH: NATIVE_ETH,
  WETH,
  USDC,
  DAI,
} as const

// Export token types for type safety
export type SupportedTokenSymbol = keyof typeof SUPPORTED_TOKENS
```

## 3. Create a New Uniswap v4 SDK Client

File: `src/lib/uniswap/UniswapV4Client.ts` (New file)

Create a dedicated client class that will encapsulate all v4 SDK functionality:

```typescript
import { ethers } from 'ethers';
import { 
  ChainId, 
  Token, 
  CurrencyAmount, 
  Percent, 
  TradeType 
} from '@uniswap/sdk-core';
import {
  Pool,
  Route,
  Trade,
  V4Planner,
  encodeRouteToPath,
  tickToPrice
} from '@uniswap/v4-sdk';
import { CONTRACT_ADDRESSES } from '../contracts';
import { CHAIN_ID, SUPPORTED_TOKENS, SupportedTokenSymbol } from './tokens';

export class UniswapV4Client {
  provider: ethers.providers.Provider;
  signer: ethers.Signer | null;
  userAddress: string | null;
  
  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer || null;
    this.userAddress = null;
  }
  
  async init(userAddress?: string) {
    if (userAddress) {
      this.userAddress = userAddress;
    } else if (this.signer) {
      this.userAddress = await this.signer.getAddress();
    }
    return this;
  }
  
  // Fetch pool data for a token pair
  async fetchPoolData(
    tokenA: Token,
    tokenB: Token,
    fee: number = 500 // 0.05%
  ) {
    try {
      const pool = await Pool.fetchData({
        tokenA,
        tokenB,
        fee,
        hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        provider: this.provider
      });
      
      return pool;
    } catch (error) {
      console.error('Error fetching pool data:', error);
      throw error;
    }
  }
  
  // Get a quote for a swap
  async getSwapQuote(
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    amount: string,
    fromDecimals: number,
    toDecimals: number
  ) {
    const tokenA = SUPPORTED_TOKENS[fromToken];
    const tokenB = SUPPORTED_TOKENS[toToken];
    
    // Convert amount to CurrencyAmount
    const amountIn = CurrencyAmount.fromRawAmount(
      tokenA,
      ethers.utils.parseUnits(amount, fromDecimals).toString()
    );
    
    try {
      // Fetch pool data
      const pool = await this.fetchPoolData(
        tokenA instanceof Token ? tokenA : SUPPORTED_TOKENS.WETH,
        tokenB instanceof Token ? tokenB : SUPPORTED_TOKENS.WETH,
        500 // 0.05% fee
      );
      
      // Create route and trade
      const route = new Route([pool], tokenA, tokenB);
      const trade = await Trade.fromRoute(route, amountIn, TradeType.EXACT_INPUT);
      
      // Get output amount
      const outputAmount = trade.outputAmount;
      
      return {
        quote: outputAmount,
        priceImpact: trade.priceImpact,
        route,
        trade
      };
    } catch (error) {
      console.error('Error getting swap quote:', error);
      throw error;
    }
  }
  
  // Execute a swap
  async executeSwap(
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    amount: string,
    slippageTolerance: number = 50, // basis points (0.5%)
    deadline: number = 20 * 60 // 20 minutes
  ) {
    if (!this.signer || !this.userAddress) {
      throw new Error('Signer or user address not initialized');
    }
    
    const tokenA = SUPPORTED_TOKENS[fromToken];
    const tokenB = SUPPORTED_TOKENS[toToken];
    
    // Get decimals
    const fromDecimals = tokenA.decimals;
    
    // Parse amount
    const amountIn = CurrencyAmount.fromRawAmount(
      tokenA,
      ethers.utils.parseUnits(amount, fromDecimals).toString()
    );
    
    try {
      // Get quote and route
      const { route, trade } = await this.getSwapQuote(
        fromToken,
        toToken,
        amount,
        fromDecimals,
        tokenB.decimals
      );
      
      // Encode hook data with user address
      const hookData = ethers.utils.defaultAbiCoder.encode(
        ['address'],
        [this.userAddress]
      );
      
      // Create the planner for generating swap parameters
      const planner = new V4Planner();
      
      // Generate swap parameters
      const { to, data, value } = planner.swapCallParameters({
        route,
        tradeType: trade.tradeType,
        amount: amountIn.quotient.toString(),
        slippageTolerance: new Percent(slippageTolerance, 10000), // Convert basis points
        deadline: Math.floor(Date.now()/1000) + deadline,
        hookOptions: {
          beforeSwap: true,
          afterSwap: true,
          beforeSwapReturnsDelta: true,
          afterSwapReturnsDelta: true
        },
        hookData
      });
      
      // Send transaction
      const tx = await this.signer.sendTransaction({
        to,
        data,
        value: fromToken === 'ETH' ? value : 0
      });
      
      return {
        hash: tx.hash,
        expectedOutput: trade.outputAmount.toExact(),
        priceImpact: trade.priceImpact.toSignificant(2)
      };
    } catch (error) {
      console.error('Error executing swap:', error);
      throw error;
    }
  }
  
  // Get pool information (price, liquidity, etc.)
  async getPoolInfo(
    tokenA: SupportedTokenSymbol,
    tokenB: SupportedTokenSymbol
  ) {
    const fromToken = SUPPORTED_TOKENS[tokenA];
    const toToken = SUPPORTED_TOKENS[tokenB];
    
    try {
      const pool = await this.fetchPoolData(
        fromToken instanceof Token ? fromToken : SUPPORTED_TOKENS.WETH,
        toToken instanceof Token ? toToken : SUPPORTED_TOKENS.WETH
      );
      
      const price = tickToPrice(
        fromToken instanceof Token ? fromToken : SUPPORTED_TOKENS.WETH,
        toToken instanceof Token ? toToken : SUPPORTED_TOKENS.WETH,
        pool.tickCurrent
      );
      
      return {
        tick: pool.tickCurrent,
        liquidity: pool.liquidity.toString(),
        sqrtPriceX96: pool.sqrtPriceX96.toString(),
        price: price.toSignificant(6),
        fee: pool.fee
      };
    } catch (error) {
      console.error('Error getting pool info:', error);
      throw error;
    }
  }
}
```

## 4. Update the Router Implementation

File: `src/lib/uniswap/swapRouter.ts`

Replace the existing router implementation with SDK-based functions:

```typescript
import { ethers } from 'ethers';
import { CurrencyAmount, TradeType, Percent } from '@uniswap/sdk-core';
import { V4Planner } from '@uniswap/v4-sdk';
import { Address } from 'viem';
import { UniswapV4Client } from './UniswapV4Client';
import { SupportedTokenSymbol, SUPPORTED_TOKENS } from './tokens';
import { CONTRACT_ADDRESSES } from '../contracts';

// Create a singleton client instance
let client: UniswapV4Client | null = null;

// Initialize client
export function initializeClient(
  provider: ethers.providers.Provider, 
  signer?: ethers.Signer
) {
  client = new UniswapV4Client(provider, signer);
  return client;
}

// Get the client instance
export function getClient() {
  if (!client) {
    throw new Error('Uniswap V4 client not initialized');
  }
  return client;
}

// Get quote for swap
export async function getSwapQuote(
  fromToken: SupportedTokenSymbol,
  toToken: SupportedTokenSymbol,
  amount: bigint
): Promise<any> {
  try {
    if (!client) {
      throw new Error('Uniswap V4 client not initialized');
    }
    
    const tokenA = SUPPORTED_TOKENS[fromToken];
    const tokenB = SUPPORTED_TOKENS[toToken];
    
    // Convert amount to string for the client
    const amountStr = ethers.utils.formatUnits(amount, tokenA.decimals);
    
    // Get quote
    const result = await client.getSwapQuote(
      fromToken, 
      toToken, 
      amountStr,
      tokenA.decimals,
      tokenB.decimals
    );
    
    return {
      quote: result.quote,
      route: result.route
    };
  } catch (error) {
    console.error("Error generating quote:", error);
    throw error;
  }
}

// Execute swap
export async function executeSwap(
  params: {
    fromToken: SupportedTokenSymbol;
    toToken: SupportedTokenSymbol;
    amount: bigint;
    slippageTolerance: number;
    recipient: Address;
  },
  route: any
) {
  try {
    if (!client) {
      throw new Error('Uniswap V4 client not initialized');
    }
    
    const { fromToken, toToken, amount, slippageTolerance } = params;
    const tokenA = SUPPORTED_TOKENS[fromToken];
    
    // Convert amount to string
    const amountStr = ethers.utils.formatUnits(amount, tokenA.decimals);
    
    // Execute swap
    const result = await client.executeSwap(
      fromToken,
      toToken,
      amountStr,
      slippageTolerance,
      1200 // 20 minutes deadline
    );
    
    return {
      hash: result.hash,
      expectedOutput: result.expectedOutput,
      priceImpact: result.priceImpact
    };
  } catch (error) {
    console.error('Error executing swap:', error);
    throw error;
  }
}

// Encode hook data for SpendSave
export function encodeSpendSaveHookData(userAddress: string): string {
  return ethers.utils.defaultAbiCoder.encode(
    ['address'],
    [userAddress]
  );
}
```

## 5. Update the Custom Hook for Swapping with Savings

File: `src/lib/hooks/useSwapWithSavings.ts`

Modify the hook to use the new SDK client:

```typescript
// Add near the top of the file
import { initializeClient, getClient, getSwapQuote, executeSwap } from '../uniswap/swapRouter';
import { ethers } from 'ethers';

// Then update the useEffect for fetching quotes:
useEffect(() => {
  const fetchQuote = async () => {
    if (!props || !address || !amount || parseFloat(amount) <= 0) return;

    try {
      // Initialize Uniswap client if not already initialized
      if (!getClient()) {
        // Convert your provider from wagmi to ethers
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const signer = provider.getSigner();
        await initializeClient(provider, signer).init(address);
      }
      
      const fromTokenInfo = getTokenBySymbol(fromToken);
      const toTokenInfo = getTokenBySymbol(toToken);
      
      if (!fromTokenInfo || !toTokenInfo) {
        throw new Error('Invalid token configuration');
      }

      // For very small transactions, use approximated pricing as a fallback
      if (fromToken === 'ETH' && parseFloat(actualSwapAmount) < TX_SIZE_THRESHOLDS.MICRO) {
        console.info('Using fixed price estimate for micro transaction');
        // ... existing fallback price logic ...
        return;
      }

      try {
        const quoteAmountBigInt = BigInt(parseUnits(actualSwapAmount, fromTokenInfo.decimals));
        
        // Use the v4 SDK client for quotes
        const quotePromise = getSwapQuote(fromToken, toToken, quoteAmountBigInt);
        const timeoutPromise = new Promise<any>((_, reject) => 
          setTimeout(() => reject(new Error('Quote fetch timeout')), 3000)
        );
        
        const result = await Promise.race([quotePromise, timeoutPromise]);
        const quoteBigInt = BigInt(result.quote.quotient.toString());

        setEstimatedOutput(formatUnits(quoteBigInt, toTokenInfo.decimals));
      } catch (err) {
        console.error('Error fetching quote:', err);
        // Existing fallback logic...
      }
    } catch (err) {
      // Existing error handling...
    }
  };

  fetchQuote();
}, [address, fromToken, toToken, actualSwapAmount, amount, props]);

// And update the executeSwapFunction to use the SDK client:
const executeSwapFunction = async () => {
  if (!props || !address || !amount || parseFloat(amount) <= 0) {
    throw new Error('Invalid swap parameters');
  }

  try {
    setExecutionStatus('preparing');
    setError(null);

    const fromTokenInfo = getTokenBySymbol(fromToken);
    if (!fromTokenInfo) {
      throw new Error('Invalid from token');
    }

    // Parse amounts
    const amountInBigInt = BigInt(parseUnits(actualSwapAmount, fromTokenInfo.decimals));
    
    // Get swap route - with error handling
    let route;
    try {
      const quotePromise = getSwapQuote(fromToken, toToken, amountInBigInt);
      const timeoutPromise = new Promise<any>((_, reject) => 
        setTimeout(() => reject(new Error('Quote fetch timeout')), 3000)
      );
      
      route = await Promise.race([quotePromise, timeoutPromise]).then(result => result.route);
    } catch (error) {
      console.warn('Quote fetch failed, using fallback route', error);
      route = null;
    }

    // Execute the swap using SDK
    const result = await executeSwap(
      {
        fromToken,
        toToken,
        amount: amountInBigInt,
        slippageTolerance: slippage * 100, // Convert to basis points
        recipient: address
      },
      route
    );
    
    setTransactionHash(result.hash as `0x${string}`);
    setExecutionStatus('pending');
    
  } catch (error) {
    // Existing error handling...
  }
};
```

## 6. Update UniswapV4Integration.ts

File: `src/lib/uniswap/UniswapV4Integration.ts`

Enhance the integration file with SDK-specific functions:

```typescript
// Add these imports at the top
import { ethers } from 'ethers';
import { Pool, tickToPrice } from '@uniswap/v4-sdk';
import { SUPPORTED_TOKENS, SupportedTokenSymbol } from './tokens';

// Add this function to get current pool tick and price
export async function getCurrentPoolPrice(
  tokenA: SupportedTokenSymbol,
  tokenB: SupportedTokenSymbol,
  provider: ethers.providers.Provider
): Promise<{ tick: number; price: string }> {
  try {
    const fromToken = SUPPORTED_TOKENS[tokenA];
    const toToken = SUPPORTED_TOKENS[tokenB];
    
    // Ensure tokens are in the correct order
    const [token0, token1] = fromToken.sortsBefore(toToken) 
      ? [fromToken, toToken] 
      : [toToken, fromToken];
    
    // Fetch pool data
    const pool = await Pool.fetchData({
      tokenA: token0,
      tokenB: token1,
      fee: 500, // 0.05%
      hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
      provider
    });
    
    // Get current tick
    const currentTick = pool.tickCurrent;
    
    // Convert tick to price
    const price = tickToPrice(fromToken, toToken, currentTick);
    
    return {
      tick: currentTick,
      price: price.toSignificant(6)
    };
  } catch (error) {
    console.error('Error getting pool price:', error);
    throw error;
  }
}
```

## 7. Add a Provider Setup for ethers.js

File: `src/lib/utils/provider.ts` (New file)

Create a utility to convert wagmi providers to ethers:

```typescript
import { ethers } from 'ethers';

// Convert window.ethereum to ethers provider
export function getEthersProvider(): ethers.providers.Web3Provider {
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum);
  }
  throw new Error('No ethereum provider found. Please install MetaMask or another wallet.');
}

// Get a signer from the provider
export function getEthersSigner(provider?: ethers.providers.Web3Provider): ethers.Signer {
  const ethersProvider = provider || getEthersProvider();
  return ethersProvider.getSigner();
}
```

## 8. Add Initialization to App Provider

File: `src/app/providers.tsx`

Add initialization code to set up the client when the app loads:

```typescript
// Add this import
import { initializeClient } from '@/lib/uniswap/swapRouter';
import { getEthersProvider, getEthersSigner } from '@/lib/utils/provider';

// Add this inside the Providers component's useEffect
useEffect(() => {
  // Initialize Uniswap V4 client
  const setupUniswapClient = async () => {
    try {
      if (isConnected && address) {
        const provider = getEthersProvider();
        const signer = getEthersSigner(provider);
        await initializeClient(provider, signer).init(address);
        console.log('Uniswap V4 client initialized');
      }
    } catch (error) {
      console.error('Failed to initialize Uniswap V4 client:', error);
    }
  };
  
  setupUniswapClient();
}, [isConnected, address]);
```

## 9. Update Other Dependencies

To ensure compatibility, update the project.json:

```json
"dependencies": {
  "@uniswap/sdk-core": "^4.0.6",
  "@uniswap/v4-sdk": "^1.0.0",
  "ethers": "^5.7.2",
  // ... other dependencies
}
```

## Implementation Summary

These changes will fully integrate the Uniswap v4 SDK into your application, replacing the current direct contract interactions with the more robust SDK approach. The key benefits include:

1. **Better Price Accuracy**: Using the SDK's pool data fetching and trade calculation
2. **Simpler Route Management**: SDK handles pool selection and routing
3. **Enhanced Error Handling**: Built-in validation and error management
4. **Future Compatibility**: Easier upgrades as Uniswap enhances its protocol

The implementation maintains compatibility with your existing SpendSaveHook by properly encoding the user address in hookData, ensuring that your savings, DCA, and other features continue to work seamlessly with the new SDK-based swaps. 