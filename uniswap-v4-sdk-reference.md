# Uniswap v4 SDK Reference Documentation

## Table of Contents

- [Overview](#overview)
- [Installation](#installation)
- [Architecture Overview](#architecture-overview)
  - [Singleton Design](#singleton-design)
  - [Hooks](#hooks)
  - [Dynamic Fees](#dynamic-fees)
  - [Flash Accounting](#flash-accounting)
  - [Native ETH](#native-eth)
  - [Custom Accounting](#custom-accounting)
- [Core Components](#core-components)
  - [Hook Class](#hook-class)
  - [Pool Class](#pool-class)
  - [Position Class](#position-class)
  - [Route Class](#route-class)
  - [Trade Class](#trade-class)
  - [V4PositionManager Class](#v4positionmanager-class)
- [Key Workflows & Usage Patterns](#key-workflows--usage-patterns)
  - [Pool Creation](#pool-creation)
  - [Trading/Swapping](#tradingswapping)
  - [Liquidity Management](#liquidity-management)
  - [Hook Integration](#hook-integration)
- [Best Practices & Considerations](#best-practices--considerations)
  - [Slippage Protection](#slippage-protection)
  - [Transaction Deadlines](#transaction-deadlines)
  - [Pool Selection](#pool-selection)
  - [Hook Development](#hook-development)
- [Utility Functions](#utility-functions)

## Overview

The Uniswap v4 SDK provides abstractions to facilitate interactions with Uniswap v4 smart contracts in a TypeScript/JavaScript environment (websites, node scripts). It leverages the Core SDK for common abstractions across Uniswap SDKs and supports key functionalities including adding/removing liquidity, collecting fees, and integrating with hooks, a notable new feature in v4.

(Source: [Overview - Uniswap v4 SDK](https://docs.uniswap.org/sdk/v4/overview))

## Installation

```bash
npm i --save @uniswap/v4-sdk
npm i --save @uniswap/sdk-core
```

(Source: [Overview - Uniswap v4 SDK](https://docs.uniswap.org/sdk/v4/overview))

## Architecture Overview

### Singleton Design

Uniswap v4 introduces a new architecture where all pools are managed by a single PoolManager contract. This singleton design provides major gas savings as creating a pool becomes a state update rather than deploying a new contract, and swapping through multiple pools no longer requires transferring tokens for intermediate pools.

(Source: [Uniswap v4 - Overview](https://docs.uniswap.org/contracts/v4/overview))

### Hooks

Hooks are a core architectural feature of Uniswap v4, allowing developers to attach Solidity logic to the swap lifecycle. Hooks are deployed contracts called by the Uniswap v4 PoolManager for permissionless execution at specific lifecycle points.

Hooks are executed before and/or after major operations:
- Pool creation
- Liquidity addition and removal
- Swapping
- Donations

This flexibility enables features like:
- Limit orders
- Custom oracles
- Fee management
- Automated liquidity management

(Source: [Uniswap v4 - Overview](https://docs.uniswap.org/contracts/v4/overview), [IHooks](https://docs.uniswap.org/contracts/v4/reference/core/interfaces/IHooks))

### Dynamic Fees

Uniswap v4 supports dynamic fees, allowing pools to adjust fees up or down. Unlike other AMMs with hard-coded logic for dynamic fees, v4 provides no opinionated calculation of the fee. The frequency of liquidity fee updates is flexible and determined by the developer.

(Source: [Uniswap v4 - Overview](https://docs.uniswap.org/contracts/v4/overview))

### Flash Accounting

Uniswap v4 leverages EIP-1153 Transient Storage for "flash accounting." This optimization efficiently records balance changes in transient storage, allowing users to only pay the final balance change without resolving intermediate changes.

(Source: [Uniswap v4 - Overview](https://docs.uniswap.org/contracts/v4/overview))

### Native ETH

Uniswap v4 supports native token assets (Ether) without requiring wrapping/unwrapping to WETH9.

(Source: [Uniswap v4 - Overview](https://docs.uniswap.org/contracts/v4/overview))

### Custom Accounting

Custom accounting allows developers to alter token amounts for swaps and liquidity modifications, enabling hooks to charge fees or use alternative pricing models.

(Source: [Uniswap v4 - Overview](https://docs.uniswap.org/contracts/v4/overview))

## Core Components

### Hook Class

The Hook class provides utilities for working with hooks in Uniswap v4:

```typescript
import { Hook } from '@uniswap/v4-sdk'
```

Key methods:
- `permissions(address)`: Returns permissions for the hook address
- `hasPermission(address, hookOption)`: Checks if a hook has a specific permission
- `hasInitializePermissions(address)`: Checks for initialize permissions
- `hasLiquidityPermissions(address)`: Checks for liquidity permissions
- `hasSwapPermissions(address)`: Checks for swap permissions
- `hasDonatePermissions(address)`: Checks for donate permissions

(Source: [Hook Class Documentation](https://docs.uniswap.org/sdk/v4/reference/classes/Hook))

### Pool Class

The Pool class represents a Uniswap v4 pool:

```typescript
import { Pool } from '@uniswap/v4-sdk'
```

Key constructor parameters:
- `currencyA`: One of the currencies in the pool
- `currencyB`: The other currency in the pool
- `fee`: Pool fee in hundredths of a bips
- `tickSpacing`: The tickSpacing of the pool
- `hooks`: Address of the hook contract
- `sqrtRatioX96`: Square root of the current price ratio
- `liquidity`: Current value of in-range liquidity
- `tickCurrent`: Current tick of the pool
- `ticks`: Tick data provider

Key properties and methods:
- `currency0`, `currency1`: The currencies in the pool
- `fee`: Pool fee
- `tickSpacing`: Pool tick spacing
- `hooks`: Hook address
- `liquidity`: Pool liquidity
- `sqrtRatioX96`: Square root of price ratio
- `poolKey`: Pool key object
- `poolId`: Pool ID
- `getInputAmount()`: Computes input amount for a desired output
- `getOutputAmount()`: Computes output amount for a given input
- `priceOf()`: Returns price of a given currency
- `involvesToken()`: Checks if a currency is part of the pool

(Source: [Pool Class Documentation](https://docs.uniswap.org/sdk/v4/reference/classes/Pool))

### Position Class

The Position class represents a position on a Uniswap v4 Pool:

```typescript
import { Position } from '@uniswap/v4-sdk'
```

Constructor parameters:
- `pool`: Pool instance
- `tickLower`: Lower tick boundary
- `tickUpper`: Upper tick boundary
- `liquidity`: Position liquidity amount

Static creation methods:
- `fromAmounts({ pool, tickLower, tickUpper, amount0, amount1 })`: Creates position from token amounts
- `fromAmount0({ pool, tickLower, tickUpper, amount0 })`: Creates position with specified amount of token0
- `fromAmount1({ pool, tickLower, tickUpper, amount1 })`: Creates position with specified amount of token1

Key methods:
- `mintAmountsWithSlippage()`: Calculates maximum token amounts needed for position with slippage
- `burnAmountsWithSlippage()`: Calculates minimum amounts for safely burning liquidity with slippage
- `permitBatchData()`: Generates batch permit data for adding liquidity

(Source: [Position Class Documentation](https://docs.uniswap.org/sdk/v4/reference/classes/Position))

### Route Class

The Route class represents a list of pools through which a swap can occur:

```typescript
import { Route } from '@uniswap/v4-sdk'
```

Constructor parameters:
- `pools`: Ordered array of Pool objects for the swap route
- `input`: Input currency
- `output`: Output currency

Key properties:
- `pools`: Array of pools in the route
- `input`, `output`: Input and output currencies
- `pathInput`, `pathOutput`: Path input and output currencies
- `currencyPath`: Array of currencies in the path

Key getters:
- `midPrice`: Returns the mid price of the route

(Source: [Route Class Documentation](https://docs.uniswap.org/sdk/v4/reference/classes/Route))

### Trade Class

The Trade class represents a trade executed against a set of routes:

```typescript
import { Trade } from '@uniswap/v4-sdk'
```

Key properties:
- `swaps`: Details of the individual swaps that make up the trade
- `tradeType`: Type of trade (exact input or exact output)

Key getters:
- `inputAmount`: Input amount assuming no slippage
- `outputAmount`: Output amount assuming no slippage
- `executionPrice`: Price expressed as output/input
- `priceImpact`: Percent difference between route mid price and execution price

Static methods:
- `exactIn(route, amountIn)`: Constructs exact input trade
- `exactOut(route, amountOut)`: Constructs exact output trade
- `fromRoute(route, amount, tradeType)`: Constructs trade by simulating swaps
- `fromRoutes(routes, tradeType)`: Constructs trade from multiple routes
- `bestTradeExactIn()`: Finds best trades for exact input amount
- `bestTradeExactOut()`: Finds best trades for exact output amount
- `createUncheckedTrade()`: Creates trade without computing route swap
- `createUncheckedTradeWithMultipleRoutes()`: Creates multi-route trade without computing swaps

Instance methods:
- `minimumAmountOut(slippageTolerance)`: Calculates minimum output with slippage
- `maximumAmountIn(slippageTolerance)`: Calculates maximum input with slippage
- `worstExecutionPrice(slippageTolerance)`: Execution price with slippage

(Source: [Trade Class Documentation](https://docs.uniswap.org/sdk/v4/reference/classes/Trade))

### V4PositionManager Class

The V4PositionManager class provides methods to interact with position management:

```typescript
import { V4PositionManager } from '@uniswap/v4-sdk'
```

Key functionalities include:
- Creating and managing liquidity positions
- Adding and removing liquidity
- Collecting fees

(Source: [Overview - Technical Reference](https://docs.uniswap.org/sdk/v4/reference/overview))

## Key Workflows & Usage Patterns

### Pool Creation

Creating a pool in Uniswap v4 can be done by calling `initialize()` on PoolManager or using PositionManager's `multicall()` to create a pool and add liquidity atomically:

```typescript
// Configure the Pool
const pool = PoolKey({
    currency0: currency0,
    currency1: currency1,
    fee: lpFee,
    tickSpacing: tickSpacing,
    hooks: hookContract
});

// Calling initialize
IPoolManager(manager).initialize(pool, startingPrice);
```

(Source: [Create Pool - Quickstart](https://docs.uniswap.org/contracts/v4/quickstart/create-pool))

### Trading/Swapping

Trading in Uniswap v4 can be performed through the Universal Router, which abstracts the complexity of direct interaction with the PoolManager:

1. Create a Route with pools
2. Create a Trade using the route and amount
3. Get swap parameters from the Trade
4. Execute the swap transaction

For Universal Router usage:
```typescript
// Encode swap command
bytes memory commands = abi.encodePacked(uint8(Commands.V4_SWAP));

// Encode V4Router actions
bytes memory actions = abi.encodePacked(
    uint8(Actions.SWAP_EXACT_IN_SINGLE),
    uint8(Actions.SETTLE_ALL),
    uint8(Actions.TAKE_ALL)
);

// Prepare swap inputs
bytes[] memory params = new bytes[](3);
// ... Encode parameters

// Execute swap
router.execute(commands, inputs, deadline);
```

(Source: [Swap Routing Guide](https://docs.uniswap.org/contracts/v4/guides/swap-routing))

### Liquidity Management

Managing liquidity in Uniswap v4 involves:

1. Minting a position:
   - Encode MINT_POSITION and SETTLE_PAIR actions
   - Specify pool, tick range, liquidity amount
   - Execute via PositionManager

2. Increasing liquidity:
   - Similar to minting, but using an existing position ID

3. Decreasing liquidity:
   - Encode DECREASE_LIQUIDITY action with token ID and amount
   - Specify recipient for tokens
   - Execute via PositionManager

4. Collecting fees:
   - Use COLLECT_FEES action with token ID
   - Executed via PositionManager

(Source: [Manage Liquidity - Quickstart](https://docs.uniswap.org/contracts/v4/quickstart/manage-liquidity/decrease-liquidity))

### Hook Integration

When working with hooks:

1. Define hook permissions with `getHookPermissions()`
2. Implement hook functions (`_beforeSwap`, `_afterSwap`, etc.)
3. Deploy hooks to addresses with proper permission bits
4. Create pools with these hooks
5. Send necessary hook data in operations

Example hook implementation:
```solidity
function getHookPermissions() public pure override returns (Hooks.Permissions memory) {
    return Hooks.Permissions({
        beforeInitialize: false,
        afterInitialize: false,
        beforeAddLiquidity: false,
        afterAddLiquidity: true,
        beforeRemoveLiquidity: false,
        afterRemoveLiquidity: false,
        beforeSwap: false,
        afterSwap: true,
        beforeDonate: false,
        afterDonate: false,
        // ... other permissions
    });
}
```

(Source: [Building Your First Hook](https://docs.uniswap.org/contracts/v4/guides/hooks/your-first-hook))

## Best Practices & Considerations

### Slippage Protection

Always include slippage tolerance when executing trades to protect against price movements:

```typescript
const slippageTolerance = new Percent(50, 10_000); // 50 bips, or 0.50%
```

(Source: [Executing a Trade](https://docs.uniswap.org/sdk/v3/guides/swaps/trading))

### Transaction Deadlines

Set reasonable deadlines for transactions to prevent them from being executed at unfavorable future times:

```typescript
const deadline = Math.floor(Date.now() / 1000) + 60 * 20; // 20 minutes
```

Never use `block.timestamp` or `type(uint256).max` as deadline parameters.

(Source: [Swap Routing Guide](https://docs.uniswap.org/contracts/v4/guides/swap-routing))

### Pool Selection

When creating pools, consider:
- Appropriate fee tiers based on expected volatility
- Tick spacing that balances precision vs. gas costs
- Whether to use hooks for custom logic

Lower tick spacing provides improved price precision but causes swaps to cross ticks more often, increasing gas costs.

(Source: [Create Pool - Quickstart](https://docs.uniswap.org/contracts/v4/quickstart/create-pool))

### Hook Development

When developing hooks:
- Use BEFORE_ hooks for validation and preparation
- Use AFTER_ hooks for state updates and reward distributions
- Be mindful of gas costs, as hooks add overhead to operations
- Carefully design hook permissions
- Consider deploying to addresses with exact permission flags

(Source: [Swap Hooks](https://docs.uniswap.org/contracts/v4/quickstart/hooks/swap))

## Utility Functions

The SDK provides several utility functions:

- `amountWithPathCurrency(amount, pool)`: Converts currency amount for path
- `encodeRouteToPath(route, exactOutput)`: Encodes route into path format
- `getPathCurrency(currency, pool)`: Gets path currency
- `priceToClosestTick(price)`: Converts price to closest tick
- `tickToPrice(baseCurrency, quoteCurrency, tick)`: Converts tick to price
- `sortsBefore(currencyA, currencyB)`: Determines token ordering
- `toAddress(currency)`: Gets address from Currency
- `toHex(bigintIsh)`: Converts BigInt to hex string
- `tradeComparator(a, b)`: Compares trades for ranking

(Source: [Overview - Technical Reference](https://docs.uniswap.org/sdk/v4/reference/overview)) 