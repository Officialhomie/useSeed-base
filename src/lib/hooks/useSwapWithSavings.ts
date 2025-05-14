import { useState, useEffect, useCallback } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { useEthersSigner } from './useEthersSigner';
import { getEthersProvider } from '../utils/ethersAdapter';
import { UniswapV4Client } from '../uniswap/UniswapV4Client';
import { parseUnits, formatUnits } from 'viem';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { calculateSavingsAmount } from '../utils/savingsCalculator';
import { SupportedTokenSymbol, getTokenBySymbol } from '../uniswap/tokens';
import { calculateV4SwapGasLimit } from '../uniswap/UniswapV4Integration';

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
  const { signer } = useEthersSigner();
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'preparing' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [savedAmount, setSavedAmount] = useState('0');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const [usingFallbackGas, setUsingFallbackGas] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('0');
  const [sizeCategory, setSizeCategory] = useState<string | undefined>(undefined);
  const [client, setClient] = useState<UniswapV4Client | null>(null);
  
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
    const fetchQuote = async (): Promise<void> => {
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
          const cli = await ensureClient();
          const { quote } = await cli.getSwapQuote(fromToken, toToken, quoteAmount);

          let rawOut = BigInt(quote.quotient.toString());

          if (needsScaling) {
            const scaleFactor = actualAmountFloat / TX_SIZE_THRESHOLDS.SMALL;
            rawOut = BigInt(Math.floor(Number(rawOut) * scaleFactor));
          }

          setEstimatedOutput(formatUnits(rawOut, toTokenInfo.decimals));
        } catch (err) {
          console.warn('SDK quote failed, using fallback approximation:', err);
          
          // Fall back to price approximation when quote fails
          // This is an important fallback for when the SDK's pool creation fails with PRICE_BOUNDS
          let fallbackEstimate = '0';

          // Very robust fallback system for common pairs
          if (fromToken === 'ETH') {
            const APPROX_ETH_PRICE = 2500; // $2500 per ETH
            
            if (toToken === 'USDC') {
              fallbackEstimate = (actualAmountFloat * APPROX_ETH_PRICE).toFixed(6);
            } else if (toToken === 'WETH') {
              fallbackEstimate = actualSwapAmount;
            } else if (toToken === 'DAI') {
              fallbackEstimate = (actualAmountFloat * APPROX_ETH_PRICE).toFixed(18);
            }
          } else if (toToken === 'ETH' || toToken === 'WETH') {
            // Reverse calculation for tokens to ETH/WETH
            const APPROX_TOKEN_PRICES: Record<string, number> = {
              'USDC': 1/2500, // 1 USDC = 1/2500 ETH
              'DAI': 1/2500   // 1 DAI = 1/2500 ETH
            };
            
            const tokenPrice = APPROX_TOKEN_PRICES[fromToken as 'USDC' | 'DAI'];
            if (tokenPrice) {
              fallbackEstimate = (actualAmountFloat * tokenPrice).toFixed(18);
            }
          }
          
          // Fallback for USDC/DAI pair (1:1 rate)
          if ((fromToken === 'USDC' && toToken === 'DAI') || (fromToken === 'DAI' && toToken === 'USDC')) {
            // Both stablecoins trade roughly 1:1
            fallbackEstimate = fromToken === 'USDC' 
              ? actualAmountFloat.toFixed(18)  // USDC → DAI (18 decimals)
              : actualAmountFloat.toFixed(6);  // DAI → USDC (6 decimals)
          }

          if (fallbackEstimate !== '0') {
            console.info(`Using fallback price estimate for ${fromToken}->${toToken}: ${fallbackEstimate}`);
            setEstimatedOutput(fallbackEstimate);
          } else {
            // Last resort - just use 1:1 conversion with adjusted decimals
            console.warn(`No specific fallback for ${fromToken}->${toToken}, using 1:1 rate`);
            setEstimatedOutput(actualSwapAmount);
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

  // Internal helper to lazily instantiate and cache a UniswapV4Client instance
  const ensureClient = useCallback(async (): Promise<UniswapV4Client> => {
    if (client) {
      if (!client.userAddress && address) {
        try {
          await client.init(address);
        } catch (_) {}
      }
      return client;
    }

    // Always build provider from wagmi – signer may be null for readonly fetchQuote
    const provider = await getEthersProvider();

    const newClient = new UniswapV4Client(provider, signer ?? undefined);
    
    // Try to initialize with address first (preferred method to avoid signer.getAddress call)
    if (address) {
      try {
        await newClient.init(address);
      } catch (err) {
        console.error('Error initializing client with address:', err);
        // If address init fails and we have a signer, try that as fallback
        if (signer) {
          try {
            await newClient.init();
          } catch (signerErr) {
            console.error('Error initializing client with signer:', signerErr);
            // Continue without initialization - some functionality will be limited
          }
        }
      }
    }
    setClient(newClient);
    return newClient;
  }, [client, signer, address]);

  // Prevent using identical token pair – early-exit with error
  useEffect(() => {
    if (props && fromToken === toToken) {
      setError(new Error('From and To tokens must be different'));
    } else {
      setError(null);
    }
  }, [props, fromToken, toToken]);

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

      // Parse ETH value to send (only for native ETH swaps)
      const valueToSend = fromToken === 'ETH' ? BigInt(parseUnits(amount, 18)) : BigInt(0);
      
      // Ensure client first
      const cliInstance = await ensureClient();

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

      // Execute the swap via UniswapV4Client which returns a TransactionResponse
      const slippageBps = Math.floor(slippage * 100); // convert pct to basis points
      const txResponse = await cliInstance.executeSwap({
        fromToken,
        toToken,
        amountRaw: actualSwapAmount,
        slippageBps,
        disableSavings,
        hookFlags: disableSavings ? { before: false, after: false, delta: false } : undefined,
      });

      const txHash = txResponse.hash as `0x${string}`;
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