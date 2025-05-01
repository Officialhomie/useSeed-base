import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { calculateSavingsAmount } from '../utils/savingsCalculator';
import { getSwapQuote, executeSwap } from '../uniswap/swapRouter';
import { SUPPORTED_TOKENS, SupportedTokenSymbol, getTokenBySymbol } from '../uniswap/tokens';
import JSBI from 'jsbi';

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

        const amountInBigInt = BigInt(parseUnits(actualSwapAmount, fromTokenInfo.decimals));
        
        const { quote } = await getSwapQuote(
          fromToken,
          toToken,
          amountInBigInt
        );

        // Convert JSBI to bigint for formatting
        const quoteBigInt = BigInt(quote.quotient.toString());
        setEstimatedOutput(formatUnits(
          quoteBigInt,
          toTokenInfo.decimals
        ));
      } catch (err) {
        console.error('Error fetching quote:', err);
        setError(err instanceof Error ? err : new Error('Failed to fetch quote'));
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

      const amountInBigInt = BigInt(parseUnits(actualSwapAmount, fromTokenInfo.decimals));

      // Get quote and route
      const { route } = await getSwapQuote(
        fromToken,
        toToken,
        amountInBigInt
      );

      // Get swap parameters
      const swapParams = await executeSwap(
        {
          fromToken,
          toToken,
          amount: amountInBigInt,
          slippageTolerance: slippage,
          recipient: address
        },
        route
      );

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
        args: [swapParams.commands, swapParams.inputs] as const,
        value: fromToken === 'ETH' ? BigInt(parseUnits(amount, 18)) : BigInt(0),
      });

      setTransactionHash(txHash);
      setExecutionStatus('pending');
      setSavedAmount(calculatedSavingsAmount);

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
    isPreparing: executionStatus === 'preparing'
  };
} 