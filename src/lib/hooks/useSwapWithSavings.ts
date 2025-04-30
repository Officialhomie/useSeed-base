import { useState, useEffect } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits, formatUnits, Address } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { prepareSwapWithSavingsParams, calculateSwapWithSavingsGasLimit } from '../uniswap/UniswapV4Integration';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { calculateSavingsAmount } from '../utils/savingsCalculator';

interface UseSwapWithSavingsProps {
  inputToken: {
    address: Address;
    decimals: number;
    symbol: string;
  };
  outputToken: {
    address: Address;
    decimals: number;
    symbol: string;
  };
  amount: string;
  slippage: number; // As a percentage (e.g. 0.5 for 0.5%)
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
  executeSwap: () => void;
  isLoading: boolean;
  isSuccess: boolean;
  isPreparing: boolean;
}

export default function useSwapWithSavings({
  inputToken,
  outputToken,
  amount,
  slippage,
  strategy,
  overridePercentage,
  disableSavings
}: UseSwapWithSavingsProps): SwapWithSavingsResult {
  const { address } = useAccount();
  const [executionStatus, setExecutionStatus] = useState<'idle' | 'preparing' | 'pending' | 'success' | 'error'>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [savedAmount, setSavedAmount] = useState('0');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);

  // Calculate the savings amount
  const calculatedSavingsAmount = calculateSavingsAmount(
    amount,
    strategy,
    overridePercentage,
    disableSavings,
    inputToken.decimals
  );

  // Calculate actual swap amount (after savings deduction for INPUT type savings)
  const actualSwapAmount = strategy.savingsTokenType === 0 && !disableSavings
    ? (parseFloat(amount) - parseFloat(calculatedSavingsAmount)).toString()
    : amount;

  // Get price quote from Uniswap
  const { data: quoteData } = useReadContract({
    address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
    abi: [
      {
        name: 'getQuote',
        type: 'function',
        stateMutability: 'view',
        inputs: [
          { name: 'tokenIn', type: 'address' },
          { name: 'tokenOut', type: 'address' },
          { name: 'amountIn', type: 'uint256' }
        ],
        outputs: [{ name: 'amountOut', type: 'uint256' }]
      }
    ],
    functionName: 'getQuote',
    args: address && amount && parseFloat(amount) > 0 ? [
      inputToken.address,
      outputToken.address,
      parseUnits(actualSwapAmount, inputToken.decimals)
    ] : undefined,
  });

  // Update estimated output when quote changes
  useEffect(() => {
    if (quoteData) {
      setEstimatedOutput(formatUnits(quoteData, outputToken.decimals));
    }
  }, [quoteData, outputToken.decimals]);

  // Calculate minimum amount out based on slippage
  const minAmountOut = quoteData
    ? quoteData - (quoteData * BigInt(Math.floor(slippage * 100))) / BigInt(10000)
    : BigInt(0);

  // Write contract hook for executing the swap
  const { writeContractAsync, isPending } = useWriteContract();

  // Track transaction status
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: transactionHash || undefined,
  });

  // Execute the swap
  const executeSwap = async () => {
    if (!address || !amount || parseFloat(amount) <= 0) {
      return;
    }

    try {
      setExecutionStatus('preparing');
      setError(null);

      // Prepare swap parameters
      const swapParams = prepareSwapWithSavingsParams({
        tokenIn: inputToken.address,
        tokenOut: outputToken.address,
        recipient: address,
        amountIn: parseUnits(actualSwapAmount, inputToken.decimals),
        amountOutMinimum: minAmountOut,
      }, address);

      // Calculate gas limit
      const gasLimit = calculateSwapWithSavingsGasLimit(
        strategy.savingsTokenType,
        strategy.enableDCA
      );

      // Execute the swap
      const txHash = await writeContractAsync({
        address: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
        abi: [
          {
            name: 'exactInputSingle',
            type: 'function',
            stateMutability: 'payable',
            inputs: [
              {
                name: 'params',
                type: 'tuple',
                components: [
                  { name: 'tokenIn', type: 'address' },
                  { name: 'tokenOut', type: 'address' },
                  { name: 'recipient', type: 'address' },
                  { name: 'amountIn', type: 'uint256' },
                  { name: 'amountOutMinimum', type: 'uint256' },
                  { name: 'sqrtPriceLimitX96', type: 'uint160' },
                  { name: 'hookData', type: 'bytes' }
                ]
              }
            ],
            outputs: [{ name: 'amountOut', type: 'uint256' }]
          }
        ],
        functionName: 'exactInputSingle',
        args: [swapParams],
        gas: gasLimit,
      });

      // Update state with transaction hash
      setTransactionHash(txHash);
      setExecutionStatus('pending');
      setSavedAmount(calculatedSavingsAmount);

    } catch (err) {
      setExecutionStatus('error');
      setError(err instanceof Error ? err : new Error('Unknown error occurred'));
      console.error('Swap error:', err);
    }
  };

  return {
    executionStatus,
    error,
    transactionHash,
    savedAmount: calculatedSavingsAmount,
    actualSwapAmount,
    estimatedOutput,
    executeSwap,
    isLoading: isPending || isLoading,
    isSuccess,
    isPreparing: executionStatus === 'preparing'
  };
} 