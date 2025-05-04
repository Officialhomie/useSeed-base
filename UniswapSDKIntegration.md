# Uniswap v4 SDK Integration Guide for SpendSave Protocol

## Current Architecture Overview

Your SpendSave protocol has a modular architecture with the following key components:

1. **SpendSaveHook** - Main contract implementing Uniswap v4 hooks for savings collection during swaps
2. **SpendSaveStorage** - Central storage for all protocol state
3. **SavingStrategy** - Handles savings calculation and strategy management
4. **Savings** - Manages user savings deposits and withdrawals
5. **DCA** - Implements dollar-cost averaging functionality
6. **SlippageControl** - Manages slippage protection
7. **Token** - ERC6909 standard for representing saved tokens

## Key Functions From ABI Analysis

### Read Functions (View/Pure)

From analyzing your contract ABIs, these are the important read functions that would interact with your Uniswap v4 integration:

1. **SpendSaveStorage Functions**:
   - `getUserSavingStrategy(address user)` - Returns user's saving configuration
   - `savings(address user, address token)` - Gets user's saved amount for a token
   - `getSavingsData(address user, address token)` - Gets detailed savings data
   - `dcaTargetToken(address user)` - Gets user's DCA target token
   - `getDcaTickStrategy(address user)` - Gets user's DCA tick strategy parameters
   - `getDcaQueueLength(address user)` - Gets length of user's DCA queue
   - `getDcaQueueItem(address user, uint256 index)` - Gets specific queued DCA item
   - `createPoolKey(address tokenA, address tokenB)` - Creates Uniswap v4 pool key

2. **SpendSaveHook Functions**:
   - `getUserProcessingQueueLength(address user)` - Gets length of user's token processing queue
   - `getUserProcessingQueueTokens(address user)` - Gets tokens in user's processing queue
   - `getTokenLastProcessed(address user, address tokenAddr)` - Gets last processing time for a token

3. **DCA Functions**:
   - `getCurrentTick(PoolKey memory poolKey)` - Gets current tick for a pool (important for v4 interaction)

### Write Functions

These are the key write functions that would need to interact with Uniswap v4 SDK:

1. **SpendSaveHook Functions**:
   - `initializeModules(...)` - Sets up the module connections
   - `processDailySavings(address user)` - Processes daily savings for a user

2. **SavingStrategy Functions**:
   - `setSavingStrategy(...)` - Configures user's saving strategy
   - `setSavingsGoal(address user, address token, uint256 amount)` - Sets savings goal

3. **DCA Functions**:
   - `enableDCA(address user, address targetToken, bool enabled)` - Enables/disables DCA
   - `setDCATickStrategy(...)` - Sets DCA execution strategy
   - `executeDCA(address user, address fromToken, uint256 amount, uint256 slippageTolerance)` - Executes DCA swap
   - `processQueuedDCAs(address user, PoolKey memory poolKey)` - Processes queued DCA swaps
   - `queueDCAExecution(...)` - Queues a DCA swap for later execution

4. **Savings Functions**:
   - `depositSavings(address user, address token, uint256 amount)` - Deposits tokens into savings
   - `withdrawSavings(address user, address token, uint256 amount)` - Withdraws tokens from savings
   - `processSavings(address user, address token, uint256 amount)` - Processes savings

5. **SlippageControl Functions**:
   - `setSlippageTolerance(address user, uint256 basisPoints)` - Sets global slippage tolerance
   - `setTokenSlippageTolerance(address user, address token, uint256 basisPoints)` - Sets token-specific slippage 

## Current Implementation vs. SDK Approach

Currently, your protocol **directly interacts** with the Uniswap v4 Pool Manager contract:

```solidity
// Direct PoolManager interactions in current code
BalanceDelta delta = storage_.poolManager().swap(poolKey, params, "");
```

With the Uniswap v4 SDK, these low-level interactions would be abstracted through SDK classes:

```typescript
// SDK approach
const pool = await Pool.fetchData({
  tokenA: USDC,
  tokenB: WETH,
  fee: 500,
  provider
});

const route = new Route([pool], USDC, WETH);
const trade = await Trade.fromRoute(route, inputAmount, TradeType.EXACT_INPUT);

// Generate the swap parameters
const { to, data, value } = planner.swapCallParameters({...});

// Execute the transaction
await signer.sendTransaction({ to, data, value });
```

## Integration Points With Hook Data

### 1. DCA Module Integration

The DCA module's swap execution is a critical integration point:

```solidity
function _executePoolSwap(
    PoolKey memory poolKey,
    SwapExecutionParams memory params,
    bool zeroForOne,
    uint256 amount
) internal returns (SwapExecutionResult memory) {
    // Direct PoolManager calls
    params.sqrtPriceLimitX96 = zeroForOne ? 
        TickMath.MIN_SQRT_PRICE + 1 : 
        TickMath.MAX_SQRT_PRICE - 1;
    
    // Execute the swap
    BalanceDelta delta;
    try storage_.poolManager().swap(poolKey, params, "") returns (BalanceDelta _delta) {
        delta = _delta;
    } catch {
        revert SwapExecutionFailed();
    }
    
    // Calculate the amount received
    uint256 receivedAmount = _calculateReceivedAmount(delta, zeroForOne);
    // ...
}
```

With the SDK, this would become:

```typescript
// TypeScript client code for DCA execution
async function executeDCASwap(
  user: string, 
  fromToken: Token,
  toToken: Token,
  amount: string, 
  slippageTolerance: number
) {
  // 1. Create a pool instance
  const pool = await Pool.fetchData({
    tokenA: fromToken,
    tokenB: toToken,
    fee: 500, // 0.05% fee tier
    provider,
    hooks: YOUR_HOOK_ADDRESS
  });
  
  // 2. Create a route through the pool
  const route = new Route([pool], fromToken, toToken);
  
  // 3. Create a trade with exact input
  const inputAmount = CurrencyAmount.fromRawAmount(fromToken, amount);
  const trade = await Trade.fromRoute(route, inputAmount, TradeType.EXACT_INPUT);
  
  // 4. Calculate expected output
  console.log(`Expected output: ${trade.outputAmount.toExact()} ${toToken.symbol}`);
  console.log(`Price impact: ${trade.priceImpact.toSignificant(2)}%`);
  
  // 5. Create hook data payload with user address for identification
  const hookData = ethers.utils.defaultAbiCoder.encode(['address'], [user]);
  
  // 6. Generate the swap parameters with your hook configuration
  const planner = new V4Planner();
  const { to, data, value } = planner.swapCallParameters({
    route,
    tradeType: trade.tradeType,
    amount: inputAmount.quotient.toString(),
    slippageTolerance: new Percent(slippageTolerance, 10000), // Convert basis points
    deadline: Math.floor(Date.now()/1000) + 600, // 10 minutes
    hookOptions: {
      beforeSwap: true,
      afterSwap: true,
      beforeSwapReturnsDelta: true,
      afterSwapReturnsDelta: true
    },
    hookData
  });
  
  // 7. Send the transaction
  const tx = await signer.sendTransaction({ to, data, value });
  await tx.wait();
  
  return tx;
}
```

### 2. SpendSaveHook Integration for Saving Strategies

The hook needs to identify the user from the hookData. Based on the ABI, the key functions in your hook for Uniswap integration are:

```solidity
function _beforeSwap(
    address sender,
    PoolKey calldata key,
    IPoolManager.SwapParams calldata params,
    bytes calldata hookData
) internal virtual override nonReentrant returns (bytes4, BeforeSwapDelta, uint24) {
    // Extract actual user from hookData if available
    address actualUser = _extractUserFromHookData(sender, hookData);
    
    // ...strategy and savings logic...
}
```

To properly integrate this with the SDK, the client side needs to encode the user address in the hookData parameter:

```typescript
// Client-side function to create a savings-enabled swap
async function createSavingsEnabledSwap(
  user: string,
  fromToken: Token,
  toToken: Token,
  amount: string,
  savingsType: 'INPUT' | 'OUTPUT' | 'SPECIFIC',
  savingsPercentage: number
) {
  // 1. First, ensure the user has a saving strategy set up
  // This would call your contract's setSavingStrategy function
  
  // 2. Get the current pool
  const pool = await Pool.fetchData({
    tokenA: fromToken,
    tokenB: toToken,
    fee: 500,
    provider,
    hooks: SPEND_SAVE_HOOK_ADDRESS
  });
  
  // 3. Encode the user address for hook identification
  const hookData = ethers.utils.defaultAbiCoder.encode(['address'], [user]);
  
  // 4. Create the route and trade
  const route = new Route([pool], fromToken, toToken);
  const inputAmount = CurrencyAmount.fromRawAmount(fromToken, amount);
  const trade = await Trade.fromRoute(route, inputAmount, TradeType.EXACT_INPUT);
  
  // 5. Generate the swap parameters with the hookData
  const planner = new V4Planner();
  const { to, data, value } = planner.swapCallParameters({
    route,
    tradeType: trade.tradeType,
    amount: inputAmount.quotient.toString(),
    slippageTolerance: new Percent(50, 10000), // 0.5%
    deadline: Math.floor(Date.now()/1000) + 600,
    hookOptions: {
      beforeSwap: true,
      afterSwap: true,
      beforeSwapReturnsDelta: true,
      afterSwapReturnsDelta: true
    },
    hookData
  });
  
  // 6. Execute the swap
  const tx = await signer.sendTransaction({ to, data, value });
  
  return tx;
}
```

### 3. Integration with Pool Information and Tick Data

Your DCA module uses tick information for strategy execution:

```solidity
function getCurrentTick(PoolKey memory poolKey) public override nonReentrant returns (int24) {
    PoolId poolId = poolKey.toId();
    
    // Get current tick from pool manager
    (,int24 currentTick,,) = StateLibrary.getSlot0(storage_.poolManager(), poolId);
    
    // Update stored tick if changed
    _updateStoredTick(poolId, currentTick);
    
    return currentTick;
}
```

With the SDK, fetching pool information is more straightforward:

```typescript
// Client-side function to get current tick
async function getPoolTickInformation(
  tokenA: Token,
  tokenB: Token,
  feeTier: number = 500 // 0.05% default
) {
  // Fetch pool data using the SDK
  const pool = await Pool.fetchData({
    tokenA,
    tokenB,
    fee: feeTier,
    provider
  });
  
  // Access pool information
  const currentTick = pool.tickCurrent;
  const liquidity = pool.liquidity.toString();
  const sqrtPriceX96 = pool.sqrtPriceX96.toString();
  
  // Convert tick to price
  const price = tickToPrice(tokenA, tokenB, currentTick);
  
  console.log(`Current tick: ${currentTick}`);
  console.log(`Current price: ${price.toSignificant(6)} ${tokenB.symbol} per ${tokenA.symbol}`);
  console.log(`Liquidity: ${liquidity}`);
  
  return {
    tick: currentTick,
    price: price.toFixed(6),
    liquidity,
    sqrtPriceX96
  };
}
```

## Complete Integration Example

Here's a comprehensive client-side library that implements the Uniswap v4 SDK for your SpendSave protocol:

```typescript
import { ethers } from 'ethers';
import { 
  ChainId, 
  Token, 
  CurrencyAmount, 
  Percent, 
  TradeType, 
  Price 
} from '@uniswap/sdk-core';
import {
  Pool,
  Route,
  Trade,
  V4Planner,
  encodeRouteToPath,
  tickToPrice,
  priceToClosestTick,
  Hook
} from '@uniswap/v4-sdk';

// Contract ABIs
import spendSaveHookABI from './ABI/SpendSaveHook.json';
import savingStrategyABI from './ABI/SavingStrategy.json';
import dcaABI from './ABI/DCA.json';
import savingsABI from './ABI/Saving.json';
import storageABI from './ABI/SpenSaveStorage.json';

// Contract addresses (replace with your deployed addresses)
const CONTRACT_ADDRESSES = {
  spendSaveHook: '0xYourHookContractAddress',
  savingStrategy: '0xYourSavingStrategyAddress',
  dca: '0xYourDCAAddress',
  savings: '0xYourSavingsAddress',
  storage: '0xYourStorageAddress'
};

// Define chain - Base Sepolia
const BASE_SEPOLIA = 84532;

// SpendSave Client
export class SpendSaveClient {
  provider: ethers.providers.Provider;
  signer: ethers.Signer;
  userAddress: string;
  
  // Contract instances
  hookContract: ethers.Contract;
  strategyContract: ethers.Contract;
  dcaContract: ethers.Contract;
  savingsContract: ethers.Contract;
  storageContract: ethers.Contract;
  
  constructor(provider: ethers.providers.Provider, signer: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    
    // Initialize contract instances
    this.hookContract = new ethers.Contract(
      CONTRACT_ADDRESSES.spendSaveHook,
      spendSaveHookABI,
      signer
    );
    
    this.strategyContract = new ethers.Contract(
      CONTRACT_ADDRESSES.savingStrategy,
      savingStrategyABI,
      signer
    );
    
    this.dcaContract = new ethers.Contract(
      CONTRACT_ADDRESSES.dca,
      dcaABI,
      signer
    );
    
    this.savingsContract = new ethers.Contract(
      CONTRACT_ADDRESSES.savings,
      savingsABI,
      signer
    );
    
    this.storageContract = new ethers.Contract(
      CONTRACT_ADDRESSES.storage,
      storageABI,
      signer
    );
  }
  
  // Initialize with user address
  async init() {
    this.userAddress = await this.signer.getAddress();
    return this;
  }
  
  // Create token instances
  createToken(address: string, decimals: number, symbol: string, name: string) {
    return new Token(BASE_SEPOLIA, address, decimals, symbol, name);
  }
  
  // Set up a saving strategy
  async setSavingStrategy(
    percentage: number,
    autoIncrement: number = 0,
    maxPercentage: number = 10000,
    roundUpSavings: boolean = false,
    savingsTokenType: number = 0, // 0 = OUTPUT, 1 = INPUT, 2 = SPECIFIC
    specificSavingsToken: string = ethers.constants.AddressZero
  ) {
    const tx = await this.strategyContract.setSavingStrategy(
      this.userAddress,
      percentage,
      autoIncrement,
      maxPercentage,
      roundUpSavings,
      savingsTokenType,
      specificSavingsToken
    );
    
    return tx.wait();
  }
  
  // Enable DCA functionality
  async enableDCA(targetTokenAddress: string, enabled: boolean = true) {
    const tx = await this.dcaContract.enableDCA(
      this.userAddress,
      targetTokenAddress,
      enabled
    );
    
    return tx.wait();
  }
  
  // Set DCA tick strategy
  async setDCATickStrategy(
    tickDelta: number,
    tickExpiryTime: number,
    onlyImprovePrice: boolean,
    minTickImprovement: number,
    dynamicSizing: boolean
  ) {
    const tx = await this.dcaContract.setDCATickStrategy(
      this.userAddress,
      tickDelta,
      tickExpiryTime,
      onlyImprovePrice,
      minTickImprovement,
      dynamicSizing
    );
    
    return tx.wait();
  }
  
  // Get user's savings
  async getUserSavings(tokenAddress: string) {
    return await this.storageContract.savings(this.userAddress, tokenAddress);
  }
  
  // Execute a swap with savings enabled
  async executeSwapWithSavings(
    fromToken: Token,
    toToken: Token,
    amountIn: string,
    slippageTolerance: number = 50, // 0.5% default
    deadline: number = 600 // 10 minutes default
  ) {
    // Create hook data with user address for identification
    const hookData = ethers.utils.defaultAbiCoder.encode(
      ['address'], 
      [this.userAddress]
    );
    
    // Fetch pool data
    const pool = await Pool.fetchData({
      tokenA: fromToken,
      tokenB: toToken,
      fee: 500, // 0.05%
      hooks: CONTRACT_ADDRESSES.spendSaveHook,
      provider: this.provider
    });
    
    // Create route and trade
    const route = new Route([pool], fromToken, toToken);
    const inputAmount = CurrencyAmount.fromRawAmount(fromToken, amountIn);
    const trade = await Trade.fromRoute(route, inputAmount, TradeType.EXACT_INPUT);
    
    // Log expected output for user
    console.log(`Expected output: ${trade.outputAmount.toExact()} ${toToken.symbol}`);
    console.log(`Price impact: ${trade.priceImpact.toSignificant(2)}%`);
    
    // Generate swap parameters
    const planner = new V4Planner();
    const { to, data, value } = planner.swapCallParameters({
      route,
      tradeType: trade.tradeType,
      amount: inputAmount.quotient.toString(),
      slippageTolerance: new Percent(slippageTolerance, 10000),
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
    const tx = await this.signer.sendTransaction({ to, data, value });
    const receipt = await tx.wait();
    
    // Process daily savings if needed
    await this.processDailySavings();
    
    return {
      transactionHash: receipt.transactionHash,
      expectedOutput: trade.outputAmount.toExact(),
      priceImpact: trade.priceImpact.toSignificant(2)
    };
  }
  
  // Execute a DCA directly
  async executeDCA(
    fromTokenAddress: string,
    amount: string,
    slippageTolerance: number = 50 // 0.5% default
  ) {
    const tx = await this.dcaContract.executeDCA(
      this.userAddress,
      fromTokenAddress,
      amount,
      slippageTolerance
    );
    
    return tx.wait();
  }
  
  // Process daily savings
  async processDailySavings() {
    try {
      const tx = await this.hookContract.processDailySavings(this.userAddress);
      return tx.wait();
    } catch (error) {
      console.log("No pending daily savings to process or insufficient gas");
      return null;
    }
  }
  
  // Withdraw savings
  async withdrawSavings(tokenAddress: string, amount: string) {
    const tx = await this.savingsContract.withdrawSavings(
      this.userAddress,
      tokenAddress,
      amount
    );
    
    return tx.wait();
  }
  
  // Get pool information
  async getPoolInfo(tokenA: Token, tokenB: Token) {
    const pool = await Pool.fetchData({
      tokenA,
      tokenB,
      fee: 500,
      provider: this.provider
    });
    
    const price = tickToPrice(tokenA, tokenB, pool.tickCurrent);
    
    return {
      tick: pool.tickCurrent,
      liquidity: pool.liquidity.toString(),
      sqrtPriceX96: pool.sqrtPriceX96.toString(),
      price: price.toSignificant(6),
      fee: pool.fee,
      token0: pool.token0.address,
      token1: pool.token1.address
    };
  }
}

// Usage example
async function example() {
  const provider = new ethers.providers.JsonRpcProvider("https://sepolia.base.org");
  const signer = new ethers.Wallet("YOUR_PRIVATE_KEY", provider);
  
  // Initialize client
  const client = await new SpendSaveClient(provider, signer).init();
  
  // Define tokens
  const USDC = client.createToken("0xYourUSDCAddress", 6, "USDC", "USD Coin");
  const WETH = client.createToken("0xYourWETHAddress", 18, "WETH", "Wrapped Ether");
  
  // Set up saving strategy - save 5% of output tokens
  await client.setSavingStrategy(500); // 5%
  
  // Execute a swap with savings
  const result = await client.executeSwapWithSavings(
    USDC,
    WETH,
    ethers.utils.parseUnits("10", 6).toString() // 10 USDC
  );
  
  console.log(`Swap executed: ${result.transactionHash}`);
  console.log(`Expected output: ${result.expectedOutput} WETH`);
}
```

## Benefits of Using the SDK

1. **Abstraction**: The SDK handles the complicated logic for routing, price calculation, and swap encoding
2. **Type Safety**: Properly typed interfaces help catch errors at development time
3. **Maintainability**: When Uniswap protocol changes, the SDK is updated, reducing your maintenance burden 
4. **Community Support**: Leverage the documentation and community around the official SDK
5. **Enhanced User Experience**: Easier to provide better UX with price impact calculations and quotes

## Next Steps

1. Install the required SDKs:
   ```bash
   npm install --save @uniswap/v4-sdk @uniswap/sdk-core ethers@5.7.2
   ```

2. Implement the `SpendSaveClient` class above to integrate with your frontend

3. Create React hooks or other UI components that leverage the client:
   ```typescript
   // Example React hook
   function useSpendSave() {
     const { provider, signer } = useWalletConnection();
     const [client, setClient] = useState<SpendSaveClient | null>(null);
     
     useEffect(() => {
       if (provider && signer) {
         new SpendSaveClient(provider, signer)
           .init()
           .then(setClient);
       }
     }, [provider, signer]);
     
     return {
       client,
       isInitialized: !!client
     };
   }
   ```

4. Test on Base Sepolia testnet with actual tokens

5. Monitor transaction success and handle user notifications when savings are processed 