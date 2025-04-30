import { useState, useEffect } from 'react';
import { useAccount, useEstimateGas, usePublicClient } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { CONTRACT_ADDRESSES } from '../contracts';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { prepareSwapWithSavingsParams, calculateSwapWithSavingsGasLimit } from '../uniswap/UniswapV4Integration';

interface GasEstimation {
  gasInWei: bigint;
  gasInEth: string;
  isLoading: boolean;
  error: Error | null;
}

/**
 * Hook to estimate gas for operations with SpendSave functionality
 */
export default function useGasEstimation(
  operationType: 'swap' | 'withdraw' | 'dca',
  strategy: SpendSaveStrategy,
  overridePercentage: number | null = null,
  disableSavings: boolean = false
): GasEstimation {
  const { address } = useAccount();
  const publicClient = usePublicClient();
  const [estimation, setEstimation] = useState<GasEstimation>({
    gasInWei: BigInt(0),
    gasInEth: '0',
    isLoading: true,
    error: null
  });

  useEffect(() => {
    const estimateGas = async () => {
      if (!address) {
        setEstimation(prev => ({ ...prev, isLoading: false }));
        return;
      }

      try {
        let gasEstimate: bigint;

        switch (operationType) {
          case 'swap': {
            // For swaps, we'll estimate the gas for a small test transaction
            const testAmount = parseUnits('0.1', 18); // 0.1 ETH worth
            const swapParams = prepareSwapWithSavingsParams({
              tokenIn: CONTRACT_ADDRESSES.ETH,
              tokenOut: CONTRACT_ADDRESSES.USDC,
              recipient: address,
              amountIn: testAmount,
              amountOutMinimum: BigInt(0),
            }, address);

            const baseGas = await publicClient.estimateGas({
              account: address,
              to: CONTRACT_ADDRESSES.UNISWAP_BASE_SEPOLIA_UNIVERSAL_ROUTER,
              data: swapParams.hookData,
              value: testAmount
            });

            // Add overhead for savings and DCA if enabled
            gasEstimate = calculateSwapWithSavingsGasLimit(
              strategy.savingsTokenType,
              strategy.enableDCA
            );
            break;
          }

          case 'withdraw': {
            // Estimate gas for withdrawal
            const withdrawData = await publicClient.simulateContract({
              account: address,
              address: CONTRACT_ADDRESSES.SAVING,
              abi: [
                {
                  name: 'withdraw',
                  type: 'function',
                  stateMutability: 'nonpayable',
                  inputs: [
                    { name: 'token', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  outputs: []
                }
              ],
              functionName: 'withdraw',
              args: [CONTRACT_ADDRESSES.ETH, parseUnits('0.1', 18)]
            });

            gasEstimate = withdrawData.request.gas || BigInt(100000);
            break;
          }

          case 'dca': {
            // Estimate gas for DCA execution
            const dcaData = await publicClient.simulateContract({
              account: address,
              address: CONTRACT_ADDRESSES.DCA,
              abi: [
                {
                  name: 'executeDCA',
                  type: 'function',
                  stateMutability: 'nonpayable',
                  inputs: [
                    { name: 'user', type: 'address' },
                    { name: 'fromToken', type: 'address' },
                    { name: 'toToken', type: 'address' },
                    { name: 'amount', type: 'uint256' }
                  ],
                  outputs: []
                }
              ],
              functionName: 'executeDCA',
              args: [
                address,
                CONTRACT_ADDRESSES.ETH,
                CONTRACT_ADDRESSES.USDC,
                parseUnits('0.1', 18)
              ]
            });

            gasEstimate = dcaData.request.gas || BigInt(150000);
            break;
          }

          default:
            throw new Error(`Unsupported operation type: ${operationType}`);
        }

        // Get current gas price
        const gasPrice = await publicClient.getGasPrice();
        
        // Calculate total gas cost in wei
        const gasInWei = gasEstimate * gasPrice;
        
        // Convert to ETH for display
        const gasInEth = formatUnits(gasInWei, 18);

        setEstimation({
          gasInWei,
          gasInEth,
          isLoading: false,
          error: null
        });

      } catch (error) {
        console.error('Gas estimation error:', error);
        setEstimation({
          gasInWei: BigInt(0),
          gasInEth: '0',
          isLoading: false,
          error: error instanceof Error ? error : new Error('Unknown error occurred')
        });
      }
    };

    estimateGas();
  }, [address, operationType, strategy, overridePercentage, disableSavings, publicClient]);

  return estimation;
} 