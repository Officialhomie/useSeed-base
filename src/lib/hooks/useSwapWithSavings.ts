import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { calculateSavingsAmount } from '../utils/savingsCalculator';
import { getSwapQuote, executeSwap } from '../uniswap/swapRouter';
import { SUPPORTED_TOKENS, SupportedTokenSymbol, getTokenBySymbol } from '../uniswap/tokens';
import { calculateV4SwapGasLimit, getTransactionSizeCategory, calculateEthBuffer } from '../uniswap/UniswapV4Integration';
import { CurrencyAmount, Token } from '@uniswap/sdk-core';

// Define SwapRoute type inline
interface SwapRoute {
  quote: CurrencyAmount<Token>;
  route: any;
}

// Transaction size thresholds in ETH
const TX_SIZE_THRESHOLDS = {
  MICRO: 0.001,
  SMALL: 0.01,
  MEDIUM: 0.1
};

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
  usingFallbackGas: boolean;
  gasEstimate: string;
  sizeCategory?: string;
}

/**
 * Custom hook for swapping tokens with integrated savings
 */
export default function useSwapWithSavings(
  props: UseSwapWithSavingsProps | null
): SwapWithSavingsResult {
  const { address } = useAccount();
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'preparing' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [savedAmount, setSavedAmount] = useState('0');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const [usingFallbackGas, setUsingFallbackGas] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('0');
  const [sizeCategory, setSizeCategory] = useState<string | undefined>(undefined);
  
  const { writeContractAsync } = useWriteContract();
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: transactionHash || undefined,
  });

  // Calculate values based on props
  const fromToken = props?.fromToken || 'ETH';
  const toToken = props?.toToken || 'USDC';
  const amount = props?.amount || '0';
  const slippage = props?.slippage || 0.5;
  const strategy = props?.strategy || {
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

  // Calculate savings amount
  const calculatedSavingsAmount = calculateSavingsAmount(
    amount,
    strategy,
    overridePercentage,
    disableSavings
  );

  // Calculate actual swap amount (after savings deduction for INPUT type savings)
  const actualSwapAmount = strategy.savingsTokenType === 0 && !disableSavings && props && strategy.isConfigured
    ? (parseFloat(amount) - parseFloat(calculatedSavingsAmount)).toString()
    : amount;

  // Get quote using Uniswap SDK
  useEffect(() => {
    const fetchQuote = async () => {
      if (!props || !address || !amount || parseFloat(amount) <= 0) return;

      try {
        const fromTokenInfo = getTokenBySymbol(fromToken);
        const toTokenInfo = getTokenBySymbol(toToken);
        
        if (!fromTokenInfo || !toTokenInfo) {
          throw new Error('Invalid token configuration');
        }

        // For very small transactions, use approximated pricing
        if (fromToken === 'ETH' && parseFloat(actualSwapAmount) < TX_SIZE_THRESHOLDS.MICRO) {
          console.info('Using fixed price estimate for micro transaction');
          
          // Use approximate ETH price for direct calculation
          const APPROX_ETH_PRICE = 2500; // $2500 per ETH
          
          if (toToken === 'USDC') {
            const estimatedUsdc = parseFloat(actualSwapAmount) * APPROX_ETH_PRICE;
            setEstimatedOutput(estimatedUsdc.toFixed(6));
            return;
          } else if (toToken === 'WETH') {
            setEstimatedOutput(actualSwapAmount);
            return;
          } else if (toToken === 'DAI') {
            const estimatedDai = parseFloat(actualSwapAmount) * APPROX_ETH_PRICE;
            setEstimatedOutput(estimatedDai.toFixed(18));
            return;
          }
        }

        // For small amounts, use a minimum for quotation then scale back
        let quoteAmount = actualSwapAmount;
        const actualAmountFloat = parseFloat(actualSwapAmount);
        let needsScaling = false;
        
        if (actualAmountFloat > 0 && actualAmountFloat < TX_SIZE_THRESHOLDS.SMALL) {
          needsScaling = true;
          quoteAmount = TX_SIZE_THRESHOLDS.SMALL.toString();
          console.info('Using minimum amount for quote, will scale result');
        }
        
        try {
          const quoteAmountBigInt = BigInt(parseUnits(quoteAmount, fromTokenInfo.decimals));
          
          // Fetch quote with timeout
          const quotePromise = getSwapQuote(fromToken, toToken, quoteAmountBigInt);
          const timeoutPromise = new Promise<SwapRoute>((_, reject) => 
            setTimeout(() => reject(new Error('Quote fetch timeout')), 3000)
          );
          
          const result = await Promise.race([quotePromise, timeoutPromise]);
          let quoteBigInt = BigInt(result.quote.quotient.toString());
  
          // Scale the result back if we used a minimum amount
          if (needsScaling) {
            const scaleFactor = actualAmountFloat / TX_SIZE_THRESHOLDS.SMALL;
            quoteBigInt = BigInt(Math.floor(Number(quoteBigInt) * scaleFactor));
          }
  
          setEstimatedOutput(formatUnits(quoteBigInt, toTokenInfo.decimals));
        } catch (err) {
          console.error('Error fetching quote:', err);
          
          // Fall back to price approximation when quote fails
          if (fromToken === 'ETH') {
            const APPROX_ETH_PRICE = 2500; // $2500 per ETH
            
            if (toToken === 'USDC') {
              const estimatedUsdc = actualAmountFloat * APPROX_ETH_PRICE;
              setEstimatedOutput(estimatedUsdc.toFixed(6));
            } else if (toToken === 'WETH') {
              setEstimatedOutput(actualSwapAmount);
            } else if (toToken === 'DAI') {
              const estimatedDai = actualAmountFloat * APPROX_ETH_PRICE;
              setEstimatedOutput(estimatedDai.toFixed(18));
            }
          } else if (toToken === 'ETH' || toToken === 'WETH') {
            // Reverse calculation for tokens to ETH/WETH
            const APPROX_TOKEN_PRICES = {
              'USDC': 1/2500, // 1 USDC = 1/2500 ETH
              'DAI': 1/2500   // 1 DAI = 1/2500 ETH
            };
            
            const price = APPROX_TOKEN_PRICES[fromToken as 'USDC' | 'DAI'] || 0;
            const estimatedEth = actualAmountFloat * price;
            setEstimatedOutput(estimatedEth.toFixed(18));
          }
          
          // Don't set error for fallback prices to avoid UI disruption
        }
      } catch (err) {
        // For zero amount, silently ignore
        if (actualSwapAmount === '0' || parseFloat(actualSwapAmount) === 0) {
          setEstimatedOutput('0');
          return;
        }
        
        console.error('Error in quote calculation:', err);
        setError(err instanceof Error ? err : new Error('Failed to calculate quote'));
      }
    };

    fetchQuote();
  }, [address, fromToken, toToken, actualSwapAmount, amount, props]);

  // Execute the swap
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
      const valueToSend = fromToken === 'ETH' ? BigInt(parseUnits(amount, 18)) : BigInt(0);
      
      // Get swap route - with error handling
      let route;
      try {
        const quotePromise = getSwapQuote(fromToken, toToken, amountInBigInt);
        const timeoutPromise = new Promise<SwapRoute>((_, reject) => 
          setTimeout(() => reject(new Error('Quote fetch timeout')), 3000)
        );
        
        route = await Promise.race([quotePromise, timeoutPromise]).then(result => result.route);
      } catch (error) {
        console.warn('Quote fetch failed, using fallback route', error);
        route = null;
      }

      // Get swap parameters
      let swapParams;
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
      } catch (error) {
        console.warn('Failed to get swap parameters', error);
        throw new Error('Failed to prepare swap transaction');
      }

      // Calculate gas limit using the improved v4 function
      const { gasLimit, usingFallback, sizeCategory: txSizeCategory } = calculateV4SwapGasLimit({
        fromToken,
        toToken,
        value: valueToSend,
        savingsTokenType: strategy.savingsTokenType,
        enableDCA: strategy.enableDCA,
        disableSavings
      });
      
      // Calculate gas estimate in ETH
      const gasPrice = BigInt(30) * BigInt(1000000000); // 30 gwei
      const gasEstimateWei = gasLimit * gasPrice;
      const gasEstimateEth = formatUnits(gasEstimateWei, 18);
      
      // Update UI state for gas information
      setUsingFallbackGas(usingFallback);
      setGasEstimate(gasEstimateEth);
      setSizeCategory(txSizeCategory);

      // Execute the swap
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
        args: [swapParams.commands, swapParams.inputs],
        value: valueToSend,
        gas: gasLimit
      });

      setTransactionHash(txHash);
      setExecutionStatus('pending');
      setSavedAmount(calculatedSavingsAmount);
    } catch (error) {
      console.error('Swap error:', error);
      
      // Improved error handling with user-friendly messages
      let errorMessage = 'Failed to execute swap';
      
      if (error instanceof Error) {
        if (error.message.includes('insufficient funds')) {
          errorMessage = 'Insufficient ETH for gas fees. Try a smaller amount or set aside more ETH for gas.';
        } else if (error.message.includes('user rejected')) {
          errorMessage = 'Transaction rejected by user.';
        } else if (error.message.includes('gas required exceeds')) {
          errorMessage = 'Transaction requires too much gas. Try disabling savings features or use a simpler transaction.';
        } else {
          errorMessage = `Error: ${error.message}`;
        }
      }
      
      setError(new Error(errorMessage));
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
    usingFallbackGas,
    gasEstimate,
    sizeCategory
  };
} 