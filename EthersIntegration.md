# Ethers.js Integration with Coinbase Wallet for SpendSave Protocol

This guide explains how to integrate ethers.js with your existing Coinbase Wallet connection to properly sign Uniswap v4 SDK transactions in your SpendSave protocol.

## 1. Overview

Your application currently uses:
- **wagmi** for React hooks
- **Coinbase Wallet** as the primary wallet connector
- **viem** for blockchain interactions

For Uniswap v4 SDK integration, you need to use **ethers.js** while maintaining compatibility with your existing wallet infrastructure.

## 2. Create an Ethers Provider/Signer Bridge

First, create a utility file that bridges between wagmi/Coinbase Wallet and ethers.js:

File: `src/lib/utils/ethersAdapter.ts`

```typescript
import { ethers } from 'ethers';
import { getWalletClient, getPublicClient } from 'wagmi/actions';
import { type PublicClient, type WalletClient } from 'wagmi';

/**
 * Create an ethers provider from a wagmi PublicClient
 */
export function publicClientToProvider(publicClient: PublicClient) {
  const { chain, transport } = publicClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address
  };
  
  if (transport.type === 'http') {
    return new ethers.providers.JsonRpcProvider(transport.url, network);
  }
  
  // Fallback to window.ethereum if available
  if (typeof window !== 'undefined' && window.ethereum) {
    return new ethers.providers.Web3Provider(window.ethereum as any, network);
  }
  
  throw new Error(`Unsupported transport type: ${transport.type}`);
}

/**
 * Create an ethers signer from a wagmi WalletClient
 */
export function walletClientToSigner(walletClient: WalletClient) {
  const { account, chain, transport } = walletClient;
  const network = {
    chainId: chain.id,
    name: chain.name,
    ensAddress: chain.contracts?.ensRegistry?.address
  };
  
  const provider = publicClientToProvider(transport.publicClient);
  const ethersProvider = new ethers.providers.Web3Provider(transport.onConnect as any, network);

  // Return a signer connected to the provider
  const signer = ethersProvider.getSigner(account.address);
  
  return signer;
}

/**
 * Get an ethers provider
 */
export async function getEthersProvider() {
  const publicClient = getPublicClient();
  return publicClientToProvider(publicClient);
}

/**
 * Get an ethers signer
 */
export async function getEthersSigner(address?: string) {
  const walletClient = await getWalletClient({ account: address });
  
  if (!walletClient) {
    throw new Error('Wallet client not found. Please connect your wallet first.');
  }
  
  return walletClientToSigner(walletClient);
}

/**
 * Create a Coinbase Wallet signer directly from window.ethereum
 * Use this as a fallback if the above methods don't work
 */
export function getCoinbaseWalletSigner() {
  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('No Ethereum provider found');
  }
  
  const provider = new ethers.providers.Web3Provider(window.ethereum as any, 'any');
  return provider.getSigner();
}
```

## 3. Update the Uniswap v4 Client

Update the client initialization to work with the ethers adapter:

File: `src/lib/uniswap/UniswapV4Client.ts`

```typescript
import { getEthersProvider, getEthersSigner, getCoinbaseWalletSigner } from '../utils/ethersAdapter';
import { useAccount } from 'wagmi';

// In the client or initialization function:
export async function initUniswapClient() {
  try {
    // First try to get provider from wagmi
    const provider = await getEthersProvider();
    
    // Try to get a signer
    let signer;
    try {
      const { address } = useAccount();
      signer = await getEthersSigner(address);
    } catch (e) {
      console.warn('Failed to get signer from wagmi, falling back to Coinbase Wallet direct connection');
      try {
        // Fallback to direct Coinbase Wallet connection
        signer = getCoinbaseWalletSigner();
      } catch (e2) {
        console.error('Could not get any signer', e2);
        // Continue with provider only
      }
    }
    
    const client = new UniswapV4Client(provider, signer);
    if (signer) {
      const address = await signer.getAddress();
      await client.init(address);
    }
    
    return client;
  } catch (error) {
    console.error('Error initializing Uniswap client:', error);
    throw error;
  }
}
```

## 4. Create a Transaction Service

Create a service to handle transaction signing and submission:

File: `src/lib/services/transactionService.ts`

```typescript
import { ethers } from 'ethers';
import { getEthersSigner, getCoinbaseWalletSigner } from '../utils/ethersAdapter';
import { useAccount } from 'wagmi';

export class TransactionService {
  private signer: ethers.Signer | null = null;
  
  /**
   * Get an ethers signer - tries multiple approaches
   */
  async getSigner(): Promise<ethers.Signer> {
    if (this.signer) return this.signer;
    
    try {
      // Try wagmi-based signer first
      const { address } = useAccount();
      this.signer = await getEthersSigner(address);
      return this.signer;
    } catch (e) {
      console.warn('Failed to get wagmi signer, trying direct Coinbase Wallet connection');
      
      try {
        // Fallback to direct web3 provider
        this.signer = getCoinbaseWalletSigner();
        return this.signer;
      } catch (e2) {
        console.error('All signer methods failed', e2);
        throw new Error('Could not connect to wallet for signing. Please check your wallet connection.');
      }
    }
  }
  
  /**
   * Send a transaction using ethers.js
   */
  async sendTransaction(txParams: ethers.providers.TransactionRequest): Promise<ethers.providers.TransactionResponse> {
    const signer = await this.getSigner();
    
    try {
      // Estimate gas if not provided
      if (!txParams.gasLimit) {
        const gasEstimate = await signer.estimateGas(txParams);
        txParams.gasLimit = gasEstimate.mul(120).div(100); // Add 20% buffer
      }
      
      // Send the transaction
      const tx = await signer.sendTransaction(txParams);
      return tx;
    } catch (error: any) {
      // Enhance error handling for user experience
      if (error.code === 'ACTION_REJECTED') {
        throw new Error('Transaction was rejected by the user');
      }
      
      if (error.message && error.message.includes('insufficient funds')) {
        throw new Error('Insufficient funds to complete this transaction');
      }
      
      console.error('Transaction error:', error);
      throw error;
    }
  }
  
  /**
   * Sign a message using ethers.js
   */
  async signMessage(message: string): Promise<string> {
    const signer = await this.getSigner();
    return await signer.signMessage(message);
  }
  
  /**
   * Sign typed data (EIP-712) using ethers.js
   */
  async signTypedData(domain: any, types: any, value: any): Promise<string> {
    const signer = await this.getSigner();
    // Use ethers._signTypedData which is available on most signers
    return await (signer as any)._signTypedData(domain, types, value);
  }
}

// Create a singleton instance
export const transactionService = new TransactionService();
```

## 5. Create a Custom React Hook for Transaction Signing

Create a hook to use the transaction service in your components:

File: `src/lib/hooks/useEthersSigner.ts`

```typescript
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { transactionService } from '../services/transactionService';
import { useAccount } from 'wagmi';

export function useEthersSigner() {
  const { address, isConnected } = useAccount();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [transactionHash, setTransactionHash] = useState<string | null>(null);
  
  /**
   * Send a transaction using ethers.js
   */
  const sendTransaction = useCallback(async (
    txParams: ethers.providers.TransactionRequest
  ): Promise<string | null> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setIsLoading(true);
    setError(null);
    setTransactionHash(null);
    
    try {
      const tx = await transactionService.sendTransaction(txParams);
      setTransactionHash(tx.hash);
      return tx.hash;
    } catch (e) {
      console.error('Transaction error:', e);
      setError(e instanceof Error ? e : new Error('Unknown error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);
  
  /**
   * Sign a message using ethers.js
   */
  const signMessage = useCallback(async (message: string): Promise<string | null> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      const signature = await transactionService.signMessage(message);
      return signature;
    } catch (e) {
      console.error('Signature error:', e);
      setError(e instanceof Error ? e : new Error('Unknown error'));
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [isConnected]);
  
  return {
    address,
    isConnected,
    isLoading,
    error,
    transactionHash,
    sendTransaction,
    signMessage
  };
}
```

## 6. Create a Uniswap Transaction Hook

Create a hook specifically for Uniswap transactions:

File: `src/lib/hooks/useUniswapTransaction.ts`

```typescript
import { useState, useCallback } from 'react';
import { ethers } from 'ethers';
import { useEthersSigner } from './useEthersSigner';
import { getClient } from '../uniswap/swapRouter';
import { Trade, Route } from '@uniswap/v4-sdk';
import { CurrencyAmount, Percent, Token, TradeType } from '@uniswap/sdk-core';
import { V4Planner } from '@uniswap/v4-sdk';
import { SupportedTokenSymbol, SUPPORTED_TOKENS } from '../uniswap/tokens';

interface SwapParams {
  fromToken: SupportedTokenSymbol;
  toToken: SupportedTokenSymbol;
  amount: string;
  slippageTolerance: number; // basis points (0.5% = 50)
  recipient?: string;
  deadline?: number; // seconds
}

export function useUniswapTransaction() {
  const { address, isConnected, isLoading, error, transactionHash, sendTransaction } = useEthersSigner();
  const [swapStatus, setSwapStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [swapError, setSwapError] = useState<Error | null>(null);
  const [expectedOutput, setExpectedOutput] = useState<string | null>(null);
  const [priceImpact, setPriceImpact] = useState<string | null>(null);
  
  /**
   * Execute a swap using Uniswap V4 SDK
   */
  const executeSwap = useCallback(async (params: SwapParams): Promise<string | null> => {
    if (!isConnected) {
      throw new Error('Wallet not connected');
    }
    
    setSwapStatus('loading');
    setSwapError(null);
    
    try {
      const client = getClient();
      
      const tokenA = SUPPORTED_TOKENS[params.fromToken];
      const tokenB = SUPPORTED_TOKENS[params.toToken];
      
      // Parse amount
      const amountIn = CurrencyAmount.fromRawAmount(
        tokenA,
        ethers.utils.parseUnits(params.amount, tokenA.decimals).toString()
      );
      
      // Get quote and route
      const { route, trade } = await client.getSwapQuote(
        params.fromToken,
        params.toToken,
        params.amount,
        tokenA.decimals,
        tokenB.decimals
      );
      
      // Store expected output for UI
      setExpectedOutput(trade.outputAmount.toExact());
      setPriceImpact(trade.priceImpact.toSignificant(2));
      
      // Encode hook data with user address for SpendSave protocol
      const hookData = ethers.utils.defaultAbiCoder.encode(
        ['address'],
        [address]
      );
      
      // Create the planner
      const planner = new V4Planner();
      
      // Calculate deadline
      const deadline = Math.floor(Date.now()/1000) + (params.deadline || 1200); // Default 20 minutes
      
      // Generate swap parameters
      const { to, data, value } = planner.swapCallParameters({
        route,
        tradeType: trade.tradeType,
        amount: amountIn.quotient.toString(),
        slippageTolerance: new Percent(params.slippageTolerance, 10000), // Convert basis points
        deadline,
        recipient: params.recipient || address,
        hookOptions: {
          beforeSwap: true,
          afterSwap: true,
          beforeSwapReturnsDelta: true,
          afterSwapReturnsDelta: true
        },
        hookData
      });
      
      // Create transaction parameters
      const txParams: ethers.providers.TransactionRequest = {
        to,
        data,
        value: params.fromToken === 'ETH' ? value.toString() : '0'
      };
      
      // Send the transaction using our ethers signer
      const txHash = await sendTransaction(txParams);
      
      if (txHash) {
        setSwapStatus('success');
        return txHash;
      } else {
        setSwapStatus('error');
        return null;
      }
    } catch (e) {
      console.error('Swap error:', e);
      setSwapError(e instanceof Error ? e : new Error('Unknown error during swap'));
      setSwapStatus('error');
      return null;
    }
  }, [isConnected, address, sendTransaction]);
  
  return {
    executeSwap,
    swapStatus,
    swapError,
    expectedOutput,
    priceImpact,
    isLoading,
    error,
    transactionHash
  };
}
```

## 7. Usage Example in a Component

Here's how to use these hooks in a component:

```tsx
import React, { useState } from 'react';
import { useUniswapTransaction } from '@/lib/hooks/useUniswapTransaction';
import { SupportedTokenSymbol } from '@/lib/uniswap/tokens';

export default function SwapComponent() {
  const [fromToken, setFromToken] = useState<SupportedTokenSymbol>('ETH');
  const [toToken, setToToken] = useState<SupportedTokenSymbol>('USDC');
  const [amount, setAmount] = useState('');
  const [slippage, setSlippage] = useState(50); // 0.5%
  
  const {
    executeSwap,
    swapStatus,
    swapError,
    expectedOutput,
    priceImpact,
    transactionHash
  } = useUniswapTransaction();
  
  const handleSwap = async () => {
    if (!amount) return;
    
    try {
      const txHash = await executeSwap({
        fromToken,
        toToken,
        amount,
        slippageTolerance: slippage
      });
      
      if (txHash) {
        console.log(`Swap successful with transaction hash: ${txHash}`);
      }
    } catch (error) {
      console.error('Failed to execute swap:', error);
    }
  };
  
  return (
    <div className="swap-container">
      <h2>Swap with Uniswap v4</h2>
      
      {/* Token selection and amount inputs */}
      <div className="form-group">
        <label>From</label>
        <select value={fromToken} onChange={(e) => setFromToken(e.target.value as SupportedTokenSymbol)}>
          <option value="ETH">ETH</option>
          <option value="WETH">WETH</option>
          <option value="USDC">USDC</option>
          <option value="DAI">DAI</option>
        </select>
        <input 
          type="text" 
          value={amount} 
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Amount" 
        />
      </div>
      
      <div className="form-group">
        <label>To</label>
        <select value={toToken} onChange={(e) => setToToken(e.target.value as SupportedTokenSymbol)}>
          <option value="ETH">ETH</option>
          <option value="WETH">WETH</option>
          <option value="USDC">USDC</option>
          <option value="DAI">DAI</option>
        </select>
        <div className="expected-output">
          {expectedOutput && `Expected: ${expectedOutput} ${toToken}`}
        </div>
      </div>
      
      <div className="slippage-control">
        <label>Slippage Tolerance: {slippage / 100}%</label>
        <input 
          type="range" 
          min="10" 
          max="500" 
          step="10" 
          value={slippage} 
          onChange={(e) => setSlippage(parseInt(e.target.value))}
        />
      </div>
      
      <button 
        onClick={handleSwap} 
        disabled={swapStatus === 'loading' || !amount}
        className="swap-button"
      >
        {swapStatus === 'loading' ? 'Swapping...' : 'Swap'}
      </button>
      
      {swapStatus === 'success' && (
        <div className="success-message">
          Swap successful! 
          <a 
            href={`https://sepolia.basescan.org/tx/${transactionHash}`} 
            target="_blank" 
            rel="noopener noreferrer"
          >
            View transaction
          </a>
        </div>
      )}
      
      {swapStatus === 'error' && (
        <div className="error-message">
          {swapError?.message || 'An error occurred during the swap.'}
        </div>
      )}
      
      {priceImpact && parseFloat(priceImpact) > 1 && (
        <div className="warning-message">
          Warning: High price impact of {priceImpact}%
        </div>
      )}
    </div>
  );
}
```

## 8. Integration with Existing SpendSave Components

To integrate with your existing SpendSave components:

1. Replace the direct transaction signing in `SwapWithSavings.tsx` with our new hook:

```tsx
// In SwapWithSavings.tsx
import { useUniswapTransaction } from '@/lib/hooks/useUniswapTransaction';

// Inside the component
const {
  executeSwap,
  swapStatus,
  swapError,
  expectedOutput,
  priceImpact,
  transactionHash
} = useUniswapTransaction();

// Replace the existing swap execution code
const handleConfirmSwap = async () => {
  if (!fromToken || !toToken || !fromAmount) return;
  
  setShowConfirmation(false);
  
  try {
    const result = await executeSwap({
      fromToken: fromToken.symbol as 'ETH' | 'WETH' | 'USDC' | 'DAI',
      toToken: toToken.symbol as 'ETH' | 'WETH' | 'USDC' | 'DAI',
      amount: fromAmount,
      slippageTolerance: parseFloat(slippage) * 100 // Convert to basis points
    });
    
    if (result) {
      // Handle successful swap
      addNotification({
        type: 'success',
        title: 'Swap Successful',
        message: `Successfully swapped ${fromAmount} ${fromToken.symbol} to approximately ${expectedOutput} ${toToken.symbol}`
      });
    }
  } catch (error) {
    console.error('Swap failed:', error);
    addNotification({
      type: 'error',
      title: 'Swap Failed',
      message: error instanceof Error ? error.message : 'Unknown error occurred'
    });
  }
};
```

## 9. Summary

This integration provides:

1. **Compatibility with Coinbase Wallet**: Preserves existing wallet connection
2. **Full ethers.js support**: For Uniswap v4 SDK integration
3. **Multiple fallback mechanisms**: Ensures transactions can be signed even if primary method fails
4. **Enhanced error handling**: Provides better user feedback
5. **Type safety**: Maintains TypeScript types throughout the codebase

The implementation maximizes compatibility while minimizing changes to your existing codebase. It allows you to use ethers.js where needed for the Uniswap v4 SDK while maintaining your Coinbase Wallet and wagmi hooks elsewhere. 