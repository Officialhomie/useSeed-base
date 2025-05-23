import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits, formatUnits } from 'viem';
import { useEthersSigner } from './useEthersSigner';
import { getEthersProvider } from '../utils/ethersAdapter';
import { UniswapV4Client } from '../uniswap/UniswapV4Client';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { SupportedTokenSymbol, getTokenBySymbol } from '../uniswap/tokens';
import { calculateV4SwapGasLimit } from '../uniswap/UniswapV4Integration';
import useSavingsPreview from './useSavingsPreview';
import { useTokenApprovals } from './useTokenApprovals';
import { CONTRACT_ADDRESSES } from '../contracts';
import { ethers } from 'ethers';
import type { ApprovalStatus, ApprovalState } from '@/components/tokens/TokenApprovalComponents';

// ========== INTERFACES ==========
interface StrategyValidationResult {
  isValid: boolean;
  needsSetup: boolean;
  errors: string[];
  warnings: string[];
  canProceedWithSwap: boolean;
}

interface StrategySetupParams {
  percentage: number;
  savingsTokenType: 0 | 1 | 2; // INPUT | OUTPUT | SPECIFIC
  specificToken?: string;
  enableDCA?: boolean;
  roundUpSavings?: boolean;
  autoIncrement?: number;
  maxPercentage?: number;
}

interface UseSwapWithSavingsProps {
  fromToken: SupportedTokenSymbol;
  toToken: SupportedTokenSymbol;
  amount: string;
  slippage: number;
  strategy: SpendSaveStrategy;
  overridePercentage: number | null;
  disableSavings: boolean;
  customGasPrice?: number | null;
  gasPriceCategory?: 'safe' | 'standard' | 'fast';
}

interface SwapWithSavingsResult {
  executionStatus: 'idle' | 'validating-strategy' | 'setting-strategy' | 'checking-approvals' | 'approving-tokens' | 'preparing' | 'pending' | 'success' | 'error';
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
  estimatedGasLimit: number;
  savingsPreview: {
    rawAmount: string;
    formattedAmount: string;
    percentage: number;
    isEnabled: boolean;
  };
  strategyValidation: StrategyValidationResult;
  isValidatingStrategy: boolean;
  isSettingUpStrategy: boolean;
  setupStrategy: (params: StrategySetupParams) => Promise<boolean>;
  canExecuteSwap: boolean;
  strategySetupRequired: boolean;
  approvalStatus: ApprovalStatus;
  approvalState: ApprovalState;
  isCheckingApprovals: boolean;
  isApprovingTokens: boolean;
  needsApprovals: boolean;
  approveAllTokens: () => Promise<boolean>;
  refreshApprovals: () => Promise<void>;
  canProceedWithApprovals: boolean;
}

// ========== CONSTANTS ==========
const TX_SIZE_THRESHOLDS = {
  MICRO: 0.001,
  SMALL: 0.01,
  MEDIUM: 0.1
};

/**
 * Custom hook for swapping tokens with integrated savings and approval management
 */
export default function useSwapWithSavings(
  props: UseSwapWithSavingsProps | null
): SwapWithSavingsResult {
  const { address } = useAccount();
  const { signer } = useEthersSigner();
  
  // ========== STATE MANAGEMENT ==========
  const [executionStatus, setExecutionStatus] = useState<SwapWithSavingsResult['executionStatus']>('idle');
  const [error, setError] = useState<Error | null>(null);
  const [savedAmount, setSavedAmount] = useState('0');
  const [estimatedOutput, setEstimatedOutput] = useState('0');
  const [transactionHash, setTransactionHash] = useState<`0x${string}` | null>(null);
  const [usingFallbackGas, setUsingFallbackGas] = useState(false);
  const [gasEstimate, setGasEstimate] = useState('0');
  const [sizeCategory, setSizeCategory] = useState<string | undefined>(undefined);
  const [client, setClient] = useState<UniswapV4Client | null>(null);
  const [estimatedGasLimit, setEstimatedGasLimit] = useState<number>(250000);
  const [isValidatingStrategy, setIsValidatingStrategy] = useState(false);
  const [isSettingUpStrategy, setIsSettingUpStrategy] = useState(false);
  const [strategyValidation, setStrategyValidation] = useState<StrategyValidationResult>({
    isValid: false,
    needsSetup: false,
    errors: [],
    warnings: [],
    canProceedWithSwap: false
  });

  // ========== DERIVED VALUES ==========
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
  const customGasPrice = props?.customGasPrice || null;
  const gasPriceCategory = props?.gasPriceCategory || 'safe';

  // Get token info for approvals
  const fromTokenInfo = props ? getTokenBySymbol(props.fromToken) : null;

  // ========== PHASE 3: APPROVAL MANAGEMENT ==========
  const {
    approvalState,
    approvalStatus, 
    isCheckingApprovals,
    isApprovingTokens,
    needsApprovals,
    canProceedWithApprovals,
    approveAllTokens,
    refreshApprovals,
  } = useTokenApprovals({
    tokenAddress: fromTokenInfo?.address as `0x${string}` || '0x0',
    tokenSymbol: fromToken,
    amount: amount,
    enabled: !disableSavings && !!props
  });

  // ========== SAVINGS PREVIEW ==========
  const savingsPreview = useSavingsPreview(
    amount,
    fromToken,
    strategy,
    overridePercentage,
    disableSavings
  );

  // ========== TRANSACTION RECEIPT MONITORING ==========
  const { isLoading, isSuccess } = useWaitForTransactionReceipt({
    hash: transactionHash || undefined,
  });

  // ========== CALCULATE ACTUAL SWAP AMOUNT ==========
  const actualSwapAmount = useMemo(() => {
    if (strategy.savingsTokenType === 0 && !disableSavings && props && strategy.isConfigured) {
      const inputAmount = parseFloat(amount);
      const savingsRawAmount = parseFloat(savingsPreview.rawAmount);
      return (inputAmount - savingsRawAmount).toString();
    }
    return amount;
  }, [amount, savingsPreview.rawAmount, strategy.savingsTokenType, strategy.isConfigured, disableSavings, props]);

  // ========== COMPUTED PROPERTIES ==========
  const canExecuteSwap = useMemo(() => {
    return strategyValidation.canProceedWithSwap && 
           canProceedWithApprovals &&
           !isValidatingStrategy && 
           !isSettingUpStrategy &&
           !isCheckingApprovals &&
           !isApprovingTokens &&
           executionStatus !== 'validating-strategy' &&
           executionStatus !== 'setting-strategy' &&
           executionStatus !== 'checking-approvals' &&
           executionStatus !== 'approving-tokens';
  }, [
    strategyValidation, 
    canProceedWithApprovals,
    isValidatingStrategy, 
    isSettingUpStrategy,
    isCheckingApprovals,
    isApprovingTokens,
    executionStatus
  ]);

  const strategySetupRequired = useMemo(() => {
    return !disableSavings && strategyValidation.needsSetup;
  }, [disableSavings, strategyValidation.needsSetup]);

  // ========== CLIENT INITIALIZATION ==========
  const ensureClient = useCallback(async (): Promise<UniswapV4Client> => {
    if (client) {
      if (!client.userAddress && address) {
        try {
          await client.init(address);
        } catch (_) {
          // Silent fail, continue with existing client
        }
      }
      return client;
    }

    const provider = await getEthersProvider();
    const newClient = new UniswapV4Client(provider, signer ?? undefined);
    
    if (address) {
      try {
        await newClient.init(address);
      } catch (err) {
        console.error('Error initializing client with address:', err);
        if (signer) {
          try {
            await newClient.init();
          } catch (signerErr) {
            console.error('Error initializing client with signer:', signerErr);
          }
        }
      }
    }
    setClient(newClient);
    return newClient;
  }, [client, signer, address]);

  // ========== STRATEGY VALIDATION ==========
  const getSavingStrategyContract = useCallback(async () => {
    if (!signer) throw new Error('Signer not available');
    const SavingStrategyABI = await import('@/abi/savings/SavingStrategy.json');
    return new ethers.Contract(
      CONTRACT_ADDRESSES.SAVING_STRATEGY,
      SavingStrategyABI.default,
      signer
    );
  }, [signer]);

  const validateStrategy = useCallback(async (): Promise<StrategyValidationResult> => {
    if (!address || disableSavings) {
      return {
        isValid: true,
        needsSetup: false,
        errors: [],
        warnings: [],
        canProceedWithSwap: true
      };
    }

    setIsValidatingStrategy(true);
    const result: StrategyValidationResult = {
      isValid: false,
      needsSetup: false,
      errors: [],
      warnings: [],
      canProceedWithSwap: false
    };

    try {
      const strategyContract = await getSavingStrategyContract();
      const userStrategy = await strategyContract.getUserSavingStrategy(address);
      
      if (!userStrategy.percentage || userStrategy.percentage.eq(0)) {
        result.needsSetup = true;
        result.errors.push('No savings percentage configured. Please set up your savings strategy.');
      } else {
        const percentage = userStrategy.percentage.toNumber() / 100;
        
        if (percentage < 1) {
          result.warnings.push('Very low savings percentage. Consider increasing for better savings.');
        }
        if (percentage > 50) {
          result.errors.push('Savings percentage too high (>50%). Please reduce for safety.');
        }
        if (userStrategy.savingsTokenType === 2) {
          if (!userStrategy.specificSavingsToken || userStrategy.specificSavingsToken === ethers.constants.AddressZero) {
            result.errors.push('Specific savings token not configured. Please set a target token.');
          }
        }
        
        if (result.errors.length === 0) {
          result.isValid = true;
          result.canProceedWithSwap = true;
        }
      }

      if (result.isValid && !disableSavings) {
        const swapAmount = parseFloat(amount);
        const percentage = userStrategy.percentage ? userStrategy.percentage.toNumber() / 100 : 0;
        const savingsAmount = (swapAmount * percentage) / 100;
        if (savingsAmount < 0.001 && fromToken === 'ETH') {
          result.warnings.push('Savings amount very small. Consider larger swap or higher percentage.');
        }
      }
    } catch (error) {
      result.errors.push('Failed to validate strategy. Please try again.');
    }

    setIsValidatingStrategy(false);
    return result;
  }, [address, disableSavings, amount, fromToken, getSavingStrategyContract]);

  const setupStrategy = useCallback(async (params: StrategySetupParams): Promise<boolean> => {
    if (!address || !signer) {
      throw new Error('Wallet not connected');
    }

    setIsSettingUpStrategy(true);
    setExecutionStatus('setting-strategy');

    try {
      const strategyContract = await getSavingStrategyContract();
      const percentageBps = Math.floor(params.percentage * 100);
      const maxPercentageBps = Math.floor((params.maxPercentage || params.percentage) * 100);
      const autoIncrementBps = Math.floor((params.autoIncrement || 0) * 100);
      
      const txParams = [
        address,
        percentageBps,
        autoIncrementBps,
        maxPercentageBps,
        params.roundUpSavings || false,
        params.savingsTokenType,
        params.specificToken || ethers.constants.AddressZero
      ];

      const tx = await strategyContract.setSavingStrategy(...txParams);
      const receipt = await tx.wait();
      
      if (receipt.status === 1) {
        const newValidation = await validateStrategy();
        setStrategyValidation(newValidation);
        setIsSettingUpStrategy(false);
        setExecutionStatus('idle');
        return true;
      } else {
        throw new Error('Strategy setup transaction failed');
      }
    } catch (error) {
      setError(new Error(`Strategy setup failed: ${error instanceof Error ? error.message : String(error)}`));
      setIsSettingUpStrategy(false);
      setExecutionStatus('error');
      return false;
    }
  }, [address, signer, getSavingStrategyContract, validateStrategy]);

  // ========== QUOTE FETCHING ==========
  useEffect(() => {
    const fetchQuote = async (): Promise<void> => {
      if (!props || !address || !amount || parseFloat(amount) <= 0) return;

      try {
        const fromTokenInfo = getTokenBySymbol(fromToken);
        const toTokenInfo = getTokenBySymbol(toToken);
        
        if (!fromTokenInfo || !toTokenInfo) {
          throw new Error('Invalid token configuration');
        }

        // For very small transactions, use approximated pricing immediately
        if (parseFloat(actualSwapAmount) < TX_SIZE_THRESHOLDS.MICRO) {
          console.info('Using fixed price estimate for micro transaction');
          provideFallbackQuote(fromToken, toToken, actualSwapAmount);
          return;
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
        
        await processQuoteWithRetries(quoteAmount, needsScaling, actualAmountFloat, toTokenInfo);
      } catch (err) {
        console.warn('All quote attempts failed, using fallback approximation:', err);
        provideFallbackQuote(fromToken, toToken, actualSwapAmount);
      }
    };

    const processQuoteWithRetries = async (
      quoteAmount: string, 
      needsScaling: boolean, 
      actualAmountFloat: number,
      toTokenInfo: any
    ) => {
      let retryCount = 0;
      const maxRetries = 3;
      
      while (retryCount < maxRetries) {
        try {
          console.info(`Quote attempt ${retryCount + 1} for ${fromToken} -> ${toToken} amount ${quoteAmount}`);
          const cli = await ensureClient();
          const result = await cli.getQuote(fromToken, toToken, quoteAmount);
          const quote = result.quote;
          
          let rawOut = BigInt(quote.quotient.toString());

          if (needsScaling) {
            try {
              const scaleFactor = actualAmountFloat / TX_SIZE_THRESHOLDS.SMALL;
              rawOut = BigInt(Math.floor(Number(rawOut) * scaleFactor));
            } catch (scaleErr) {
              console.warn("Error scaling quote result:", scaleErr);
            }
          }

          setEstimatedOutput(formatUnits(rawOut, toTokenInfo.decimals));
          return;
        } catch (err) {
          retryCount++;
          
          const errorMessage = err instanceof Error ? err.message : String(err);
          
          if (errorMessage.includes('currency.equals is not a function') ||
              errorMessage.includes('sending a transaction requires a signer')) {
            console.warn(`Quote attempt ${retryCount} failed with API issue, skipping to fallback:`, err);
            break;
          }
          
          console.warn(`Quote attempt ${retryCount} failed:`, err);
          
          if (retryCount >= maxRetries) {
            throw err;
          }
          
          await new Promise(resolve => setTimeout(resolve, 500 * Math.pow(2, retryCount)));
        }
      }
      
      throw new Error('Failed to get quote after multiple attempts');
    };

    const provideFallbackQuote = (
      fromToken: SupportedTokenSymbol,
      toToken: SupportedTokenSymbol,
      amount: string
    ) => {
      let fallbackEstimate = '0';
      const amountFloat = parseFloat(amount);

      if (fromToken === 'ETH') {
        const APPROX_ETH_PRICE = 2500;
        
        if (toToken === 'USDC') {
          fallbackEstimate = (amountFloat * APPROX_ETH_PRICE).toFixed(6);
        } else if (toToken === 'WETH') {
          fallbackEstimate = amount;
        }
      } else if (toToken === 'ETH' || toToken === 'WETH') {
        const APPROX_TOKEN_PRICES: Record<string, number> = {
          'USDC': 1/2500,
        };
        
        const tokenPrice = APPROX_TOKEN_PRICES[fromToken as 'USDC'];
        if (tokenPrice) {
          fallbackEstimate = (amountFloat * tokenPrice).toFixed(18);
        }
      }
      
      if (fallbackEstimate !== '0') {
        console.info(`Using fallback price estimate for ${fromToken}->${toToken}: ${fallbackEstimate}`);
        setEstimatedOutput(fallbackEstimate);
        setUsingFallbackGas(true);
      } else {
        console.warn(`No specific fallback for ${fromToken}->${toToken}, using 1:1 rate`);
        setEstimatedOutput(amount);
        setUsingFallbackGas(true);
      }
    };

    const debounceTimeout = 800;
    const timerId = address && fromToken && toToken && amount && parseFloat(amount) > 0 
      ? setTimeout(fetchQuote, debounceTimeout)
      : undefined;
    
    return () => {
      if (timerId) clearTimeout(timerId);
    };
  }, [
    address, 
    fromToken, 
    toToken, 
    amount && parseFloat(amount) > 0 ? parseFloat(amount).toFixed(4) : "0",
    strategy.isConfigured && !disableSavings ? strategy.currentPercentage : 0,
    disableSavings,
    actualSwapAmount,
    ensureClient
  ]);

  // ========== VALIDATION EFFECTS ==========
  useEffect(() => {
    if (props && fromToken === toToken) {
      setError(new Error('From and To tokens must be different'));
    } else {
      setError(null);
    }
  }, [props, fromToken, toToken]);

  useEffect(() => {
    if (props && address && !disableSavings) {
      validateStrategy().then(setStrategyValidation);
    } else if (disableSavings) {
      setStrategyValidation({
        isValid: true,
        needsSetup: false,
        errors: [],
        warnings: [],
        canProceedWithSwap: true
      });
    }
  }, [address, disableSavings, validateStrategy, props]);

  // ========== MAIN SWAP EXECUTION ==========
  const executeSwapFunction = async () => {
    if (!props || !address || !amount || parseFloat(amount) <= 0) {
      throw new Error('Invalid swap parameters');
    }

    // PHASE 2: Pre-Swap Strategy Validation
    setExecutionStatus('validating-strategy');
    const currentValidation = await validateStrategy();
    setStrategyValidation(currentValidation);
    
    if (!currentValidation.canProceedWithSwap) {
      const errorMsg = currentValidation.errors.length > 0 
        ? currentValidation.errors.join(' ') 
        : 'Strategy validation failed';
      throw new Error(`PHASE 2 Strategy Error: ${errorMsg}`);
    }
    
    if (currentValidation.warnings.length > 0) {
      console.warn('PHASE 2 Strategy Warnings:', currentValidation.warnings);
    }

    // PHASE 3: Pre-Swap Approval Validation
    if (needsApprovals && !canProceedWithApprovals) {
      throw new Error(`PHASE 3 Approval Error: Token approvals required for swapping and savings functionality`);
    }

    setExecutionStatus('preparing');
    setError(null);
    
    if (!signer) {
      throw new Error('Wallet connection is required. Please connect your wallet first.');
    }

    const fromTokenInfo = getTokenBySymbol(fromToken);
    if (!fromTokenInfo) {
      throw new Error('Invalid from token');
    }

    const valueToSend = fromToken === 'ETH' ? BigInt(parseUnits(amount, 18)) : BigInt(0);
    const cliInstance = await ensureClient();
    
    if (!cliInstance.signer) {
      throw new Error('Signer not available. Please reconnect your wallet.');
    }

    const { gasLimit, usingFallback, sizeCategory: txSizeCategory } = calculateV4SwapGasLimit({
      fromToken,
      toToken,
      value: valueToSend,
      savingsTokenType: strategy.savingsTokenType,
      enableDCA: strategy.enableDCA,
      disableSavings
    });

    const gasPrice = BigInt(30) * BigInt(1000000000);
    const gasEstimateWei = gasLimit * gasPrice;
    const gasEstimateEth = formatUnits(gasEstimateWei, 18);
    
    setEstimatedGasLimit(Number(gasLimit));
    setUsingFallbackGas(usingFallback);
    setGasEstimate(gasEstimateEth);
    setSizeCategory(txSizeCategory);

    try {
      const slippageBps = Math.floor(slippage * 100);
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
      setSavedAmount(savingsPreview.rawAmount);
    } catch (swapError) {
      const errorMessage = swapError instanceof Error ? swapError.message : String(swapError);
      
      if (errorMessage.includes('insufficient funds')) {
        throw new Error('Insufficient ETH for gas fees. Try a smaller amount or set aside more ETH for gas.');
      } else if (errorMessage.includes('user rejected')) {
        throw new Error('Transaction rejected by user.');
      } else if (errorMessage.includes('gas required exceeds')) {
        throw new Error('Transaction requires too much gas. Try disabling savings features or use a simpler transaction.');
      } else if (errorMessage.includes('sending a transaction requires a signer')) {
        throw new Error('Wallet connection issue. Please reconnect your wallet and try again.');
      } else if (errorMessage.includes('PRICE_BOUNDS')) {
        throw new Error('Price calculation failed. This may be due to high market volatility. Please try again later.');
      } else {
        throw swapError;
      }
    }
  };

  // ========== RETURN INTERFACE ==========
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
    sizeCategory,
    estimatedGasLimit,
    savingsPreview,
    // Strategy-related returns
    strategyValidation,
    isValidatingStrategy,
    isSettingUpStrategy,
    setupStrategy,
    canExecuteSwap,
    strategySetupRequired,
    // Approval-related returns
    approvalStatus,
    approvalState,
    isCheckingApprovals,
    isApprovingTokens,
    needsApprovals,
    approveAllTokens,
    refreshApprovals,
    canProceedWithApprovals
  };
}