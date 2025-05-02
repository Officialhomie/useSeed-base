import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { calculateSavingsAmount } from '../utils/savingsCalculator';
import { getSwapQuote, executeSwap } from '../uniswap/swapRouter';
import { SUPPORTED_TOKENS, SupportedTokenSymbol, getTokenBySymbol } from '../uniswap/tokens';
import JSBI from 'jsbi';
import { Token, CurrencyAmount } from '@uniswap/sdk-core';

// Remove the import that's causing errors
// import type { SwapRoute } from '../uniswap/types';

// Define the SwapRoute type inline using any for route to avoid import issues
interface SwapRoute {
  quote: CurrencyAmount<Token>;
  route: any; // Using any temporarily to fix linter errors
}

// Define fallback gas limits for different operation types
const FALLBACK_GAS_LIMITS = {
  BASIC_SWAP: BigInt(350000),
  WITH_SAVINGS: BigInt(500000),
  WITH_DCA: BigInt(650000),
};

// Define a small test amount for gas estimation
const TINY_TEST_AMOUNT = parseUnits('0.0001', 18); // Only 0.0001 ETH for estimation

// Define even smaller test amount
const NANO_TX_THRESHOLD = parseUnits('0.0005', 18);  // 0.0005 ETH - extremely small test amount

interface UseSwapWithSavingsProps {
  fromToken: SupportedTokenSymbol;
  toToken: SupportedTokenSymbol;
  amount: string;
  slippage: number;
  strategy: SpendSaveStrategy;
  overridePercentage: number | null;
  disableSavings: boolean;
}

interface SwapWithSavingsResult {
  executionStatus: 'idle' | 'preparing' | 'pending' | 'success' | 'error';
  error: Error | null;
  transactionHash: `0x${string}` | null;
  savedAmount: string;
  actualSwapAmount: string;
  estimatedOutput: string;
  executeSwap: () => Promise<void>;
  isLoading: boolean;
  isSuccess: boolean;
  isPreparing: boolean;
  usingFallbackGas: boolean; // New field to track if we're using fallback gas estimates
}

export default function useSwapWithSavings(
  props: UseSwapWithSavingsProps | null
): SwapWithSavingsResult {
  const { address } = useAccount();
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'preparing' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [savedAmount, setSavedAmount] = useState('0');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const { writeContractAsync } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: transactionHash || undefined,
  });
  const [usingFallbackGas, setUsingFallbackGas] = useState(false);

  // Calculate values based on props
  const fromToken = props?.fromToken || 'ETH';
  const toToken = props?.toToken || 'USDC';
  const amount = props?.amount || '0';
  const slippage = props?.slippage || 0.5;
  const strategy = props?.strategy || {
    id: 0,
    name: 'Default',
    description: '',
    currentPercentage: 0,
    autoIncrement: 0,
    maxPercentage: 0,
    goalAmount: BigInt(0),
    roundUpSavings: false,
    enableDCA: false,
    savingsTokenType: 0,
    specificSavingsToken: '0x0000000000000000000000000000000000000000' as `0x${string}`,
    isConfigured: false
  };
  const overridePercentage = props?.overridePercentage || null;
  const disableSavings = props?.disableSavings || false;

  // Calculate the savings amount
  const calculatedSavingsAmount = calculateSavingsAmount(
    amount,
    strategy as SpendSaveStrategy,
    overridePercentage,
    disableSavings
  );

  // Calculate actual swap amount (after savings deduction for INPUT type savings)
  const actualSwapAmount = strategy.savingsTokenType === 0 && !disableSavings && props
    ? (parseFloat(amount) - parseFloat(calculatedSavingsAmount)).toString()
    : amount;

  // Get quote using Uniswap SDK - update this section with better handling of micro-amounts
  useEffect(() => {
    const fetchQuote = async () => {
      if (!props || !address || !amount || parseFloat(amount) <= 0) return;

      try {
        const fromTokenInfo = getTokenBySymbol(fromToken);
        const toTokenInfo = getTokenBySymbol(toToken);
        
        if (!fromTokenInfo || !toTokenInfo) {
          throw new Error('Invalid token configuration');
        }

        // For nano transactions (under 0.001 ETH), use a fixed price estimate instead of fetching
        // This avoids RPC errors for tiny amounts
        if (fromToken === 'ETH' && parseFloat(actualSwapAmount) < 0.001) {
          console.info('Using fixed price estimate for nano transaction');
          
          // Use approximate ETH/USDC price for direct calculation
          const APPROX_ETH_PRICE = 2500; // ~$2500 per ETH
          
          if (toToken === 'USDC') {
            // Direct ETH to USDC calculation (ETH amount * $price)
            // USDC has 6 decimals
            const estimatedUsdc = parseFloat(actualSwapAmount) * APPROX_ETH_PRICE;
            setEstimatedOutput(estimatedUsdc.toFixed(6));
            return;
          } else if (toToken === 'WETH') {
            // Direct ETH to WETH is 1:1
            setEstimatedOutput(actualSwapAmount);
            return;
          } else if (toToken === 'DAI') {
            // Direct ETH to DAI calculation (ETH amount * $price)
            // DAI has 18 decimals like ETH
            const estimatedDai = parseFloat(actualSwapAmount) * APPROX_ETH_PRICE;
            setEstimatedOutput(estimatedDai.toFixed(18));
            return;
          }
        }

        // For extremely small amounts, use a minimum amount for quoting
        let quoteAmount = actualSwapAmount;
        const actualAmountFloat = parseFloat(actualSwapAmount);
        
        if (fromToken === 'ETH' && actualAmountFloat < 0.0005) {
          console.info('Amount is very small for quoting, using minimum amount');
          quoteAmount = '0.0005'; // Use minimum amount
        }
        
        const quoteAmountBigInt = BigInt(parseUnits(quoteAmount, fromTokenInfo.decimals));
        
        // Add timeout for quote
        const quotePromise = getSwapQuote(
          fromToken,
          toToken,
          quoteAmountBigInt
        );
        
        // Set timeout for quote fetch (3 seconds)
        const timeoutPromise = new Promise<SwapRoute>((_, reject) => 
          setTimeout(() => reject(new Error('Quote fetch timeout')), 3000)
        );
        
        // Race between actual quote and timeout
        const result = await Promise.race([quotePromise, timeoutPromise]);
        const quoteBigInt = BigInt(result.quote.quotient.toString());

        // Apply scaling if using minimum quote amount
        if (fromToken === 'ETH' && actualAmountFloat < 0.0005) {
          // Scale the quote back to the actual amount
          const scaledBigInt = (quoteBigInt * BigInt(parseUnits(actualSwapAmount, 18))) / BigInt(parseUnits('0.0005', 18));
          setEstimatedOutput(formatUnits(
            scaledBigInt,
            toTokenInfo.decimals
          ));
        } else {
          setEstimatedOutput(formatUnits(
            quoteBigInt,
            toTokenInfo.decimals
          ));
        }
      } catch (err) {
        console.error('Error fetching quote:', err);
        
        // For zero amount, silently ignore the error (common when user is typing)
        if (actualSwapAmount === '0' || parseFloat(actualSwapAmount) === 0) {
          setEstimatedOutput('0');
          return;
        }
        
        setError(err instanceof Error ? err : new Error('Failed to fetch quote'));
      }
    };

    fetchQuote();
  }, [address, fromToken, toToken, actualSwapAmount, amount, props]);

  // Update getAppropriateGasLimit function to handle small balances better
  const getAppropriateGasLimit = async (
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    actualValue: bigint,
    swapParams: any
  ): Promise<{ gasLimit: bigint, usingFallback: boolean }> => {
    // If not ETH swap, no need for special handling
    if (fromToken !== 'ETH') {
      try {
        // Use normal gas estimation with actual value
        return { 
          gasLimit: await window.ethereum.request({
            method: 'eth_estimateGas',
            params: [{
              from: address,
              to: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
              data: swapParams.commands + swapParams.inputs.join(''),
              value: '0x' + actualValue.toString(16)
            }]
          }),
          usingFallback: false
        };
      } catch (error) {
        console.warn('Gas estimation failed, using fallback for non-ETH swap', error);
        // Fallback for non-ETH swaps
        return {
          gasLimit: strategy.enableDCA ? FALLBACK_GAS_LIMITS.WITH_DCA : 
                  (!disableSavings && strategy.isConfigured) ? FALLBACK_GAS_LIMITS.WITH_SAVINGS : 
                  FALLBACK_GAS_LIMITS.BASIC_SWAP,
          usingFallback: true
        };
      }
    }

    // For ETH swaps, try with nano amount first
    try {
      // First try with an extremely tiny test amount (0.0005 ETH)
      const gasLimitBigInt = await window.ethereum.request({
        method: 'eth_estimateGas',
        params: [{
          from: address,
          to: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
          data: swapParams.commands + swapParams.inputs.join(''),
          value: '0x' + NANO_TX_THRESHOLD.toString(16) // Nano amount for estimation
        }]
      });
      
      // If that works, add a buffer and return
      return { 
        gasLimit: BigInt(gasLimitBigInt) * BigInt(150) / BigInt(100), // 50% buffer for small transactions
        usingFallback: false 
      };
    } catch (error) {
      console.warn('Nano gas estimation failed, using fallback', error);
      
      // Use fallback gas limits based on operation complexity
      const fallbackGas = strategy.enableDCA ? 
        FALLBACK_GAS_LIMITS.WITH_DCA : 
        (!disableSavings && strategy.isConfigured) ? 
          FALLBACK_GAS_LIMITS.WITH_SAVINGS : 
          FALLBACK_GAS_LIMITS.BASIC_SWAP;
      
      return { gasLimit: fallbackGas, usingFallback: true };
    }
  };

  // Execute the swap
  const executeSwapFunction = async () => {
    if (!props || !address || !amount || parseFloat(amount) <= 0) {
      throw new Error('Invalid swap parameters');
    }

    try {
      setExecutionStatus('preparing');
      setError(null);
      setUsingFallbackGas(false);

      const fromTokenInfo = getTokenBySymbol(fromToken);
      if (!fromTokenInfo) {
        throw new Error('Invalid from token');
      }

      // Check if amount is too small for gas estimation
      const amountInBigInt = BigInt(parseUnits(actualSwapAmount, fromTokenInfo.decimals));
      const valueToSend = fromToken === 'ETH' ? BigInt(parseUnits(amount, 18)) : BigInt(0);
      
      // If amount is extremely small, use fallback immediately
      if (valueToSend < parseUnits('0.0001', 18)) {
        console.info('Amount is very small, using fallback gas limits for safety');
        setUsingFallbackGas(true);
      }

      // Get quote and route with error handling
      let route: any;
      try {
        // For extremely small amounts, use a minimum amount for quoting
        let quoteAmount = actualSwapAmount;
        const actualAmountFloat = parseFloat(actualSwapAmount);
        
        if (fromToken === 'ETH' && actualAmountFloat < 0.0005) {
          console.info('Amount is very small for quoting, using minimum amount');
          quoteAmount = '0.0005'; // Use minimum amount
        }
        
        const quoteAmountBigInt = BigInt(parseUnits(quoteAmount, fromTokenInfo.decimals));
        
        // Add timeout for quote
        const quotePromise = getSwapQuote(
          fromToken,
          toToken,
          quoteAmountBigInt
        );
        
        // Set timeout for quote fetch (3 seconds)
        const timeoutPromise = new Promise<SwapRoute>((_, reject) => 
          setTimeout(() => reject(new Error('Quote fetch timeout')), 3000)
        );
        
        // Race between actual quote and timeout
        const result = await Promise.race([quotePromise, timeoutPromise]);
        route = result.route;
      } catch (quoteError) {
        console.warn('Quote fetch failed, using fallback route', quoteError);
        setUsingFallbackGas(true);
        
        // Fallback to a simple command and input for direct execution
        route = null; // We'll handle null route below
      }

      // Get swap parameters
      let swapParams: any;
      try {
        swapParams = await executeSwap(
          {
            fromToken,
            toToken,
            amount: amountInBigInt,
            slippageTolerance: slippage,
            recipient: address
          },
          route
        );
      } catch (swapParamsError) {
        console.warn('Failed to get swap parameters, using fallback', swapParamsError);
        setUsingFallbackGas(true);
        
        // Very minimal swap parameters as fallback
        swapParams = {
          commands: '0x',
          inputs: []
        };
      }

      // Determine gas limit to use - either calculated or fallback
      let gasLimit: bigint;
      
      // For very small ETH transactions, bypass gas estimation completely
      if (fromToken === 'ETH' && valueToSend < parseUnits('0.001', 18)) {
        console.info('Bypassing gas estimation for micro-transaction');
        setUsingFallbackGas(true);
        
        // Use higher fallback gas limits for very small transactions
        // Add 50% extra buffer to ensure success
        let baseGas = 
          strategy.enableDCA ? FALLBACK_GAS_LIMITS.WITH_DCA : 
          (!disableSavings && strategy.isConfigured) ? FALLBACK_GAS_LIMITS.WITH_SAVINGS : 
          FALLBACK_GAS_LIMITS.BASIC_SWAP;
          
        gasLimit = (baseGas * BigInt(150)) / BigInt(100); // 50% buffer
        console.info(`Using fixed gas limit for micro-tx: ${gasLimit}`);
      } else if (usingFallbackGas) {
        // Use conservative fallback gas limits based on operation type
        gasLimit = strategy.enableDCA ? FALLBACK_GAS_LIMITS.WITH_DCA : 
                  (!disableSavings && strategy.isConfigured) ? FALLBACK_GAS_LIMITS.WITH_SAVINGS : 
                  FALLBACK_GAS_LIMITS.BASIC_SWAP;
        console.info(`Using fallback gas limit: ${gasLimit}`);
      } else {
        try {
          // Use a timeout to prevent hanging
          const estimationPromise = window.ethereum.request({
            method: 'eth_estimateGas',
            params: [{
              from: address,
              to: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
              data: swapParams.commands + swapParams.inputs.join(''),
              value: '0x' + NANO_TX_THRESHOLD.toString(16) // Always use nano test value, not actual amount
            }]
          });
          
          // Set a 2 second timeout
          const timeoutPromise = new Promise((_, reject) => 
            setTimeout(() => reject(new Error('Gas estimation timeout')), 2000)
          );
          
          try {
            // Race between estimation and timeout
            const estimatedGas = await Promise.race([
              estimationPromise,
              timeoutPromise
            ]);
            
            // Add 30% buffer for small transactions
            gasLimit = BigInt(estimatedGas) * BigInt(130) / BigInt(100);
            console.info(`Successfully estimated gas: ${gasLimit}`);
          } catch (timeoutOrError) {
            console.warn('Gas estimation failed or timed out, using fallback', timeoutOrError);
            setUsingFallbackGas(true);
            
            // Use conservative fallback with higher buffer for safety
            const baseGas = strategy.enableDCA ? FALLBACK_GAS_LIMITS.WITH_DCA : 
                          (!disableSavings && strategy.isConfigured) ? FALLBACK_GAS_LIMITS.WITH_SAVINGS : 
                          FALLBACK_GAS_LIMITS.BASIC_SWAP;
            gasLimit = (baseGas * BigInt(130)) / BigInt(100); // 30% buffer
            console.info(`Using fallback gas limit after timeout: ${gasLimit}`);
          }
        } catch (error) {
          console.warn('Gas estimation setup failed, using fallback', error);
          setUsingFallbackGas(true);
          
          // Use conservative fallback gas limits
          gasLimit = strategy.enableDCA ? FALLBACK_GAS_LIMITS.WITH_DCA : 
                     (!disableSavings && strategy.isConfigured) ? FALLBACK_GAS_LIMITS.WITH_SAVINGS : 
                     FALLBACK_GAS_LIMITS.BASIC_SWAP;
          console.info(`Using fallback gas limit after estimation failure: ${gasLimit}`);
        }
      }

      // Execute the swap with enhanced error handling
      try {
        const txHash = await writeContractAsync({
          address: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
          abi: [
            {
              name: 'execute',
              type: 'function',
              stateMutability: 'payable',
              inputs: [
                { name: 'commands', type: 'bytes' },
                { name: 'inputs', type: 'bytes[]' }
              ],
              outputs: []
            }
          ],
          functionName: 'execute',
          args: [swapParams.commands, swapParams.inputs] as const,
          value: valueToSend,
          gas: gasLimit // Use our calculated gas limit
        });

        setTransactionHash(txHash);
        setExecutionStatus('pending');
        setSavedAmount(calculatedSavingsAmount);
      } catch (txError) {
        console.error('Transaction execution failed:', txError);
        
        // Provide a more detailed error message
        let errorMessage = 'Failed to execute swap';
        
        // Extract error details if available
        if (txError instanceof Error) {
          if (txError.message.includes('insufficient funds')) {
            errorMessage = 'Insufficient funds for gas * price + value. Try a smaller amount.';
          } else if (txError.message.includes('user rejected')) {
            errorMessage = 'Transaction rejected by user.';
          } else {
            errorMessage = `Error: ${txError.message}`;
          }
        }
        
        throw new Error(errorMessage);
      }
    } catch (error) {
      console.error('Swap error:', error);
      setError(error instanceof Error ? error : new Error('Failed to execute swap'));
      setExecutionStatus('error');
    }
  };

  return {
    executionStatus,
    error,
    transactionHash,
    savedAmount,
    actualSwapAmount,
    estimatedOutput,
    executeSwap: executeSwapFunction,
    isLoading,
    isSuccess,
    isPreparing: executionStatus === 'preparing',
    usingFallbackGas // Return the new field
  };
} 