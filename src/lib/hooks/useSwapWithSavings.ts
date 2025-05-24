import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
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
  validationLevel: 'none' | 'basic' | 'comprehensive' | 'failed';
  blockingErrors: string[];
  recommendations: string[];
}

// Add strategy validation error types
type StrategyValidationError = 
  | 'STRATEGY_NOT_CONFIGURED'
  | 'PERCENTAGE_TOO_LOW' 
  | 'PERCENTAGE_TOO_HIGH'
  | 'SPECIFIC_TOKEN_MISSING'
  | 'INVALID_CONFIGURATION'
  | 'STRATEGY_VALIDATION_FAILED';

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
    canProceedWithSwap: false,
    validationLevel: 'none',
    blockingErrors: [],
    recommendations: []
  });

  // PHASE 2: Add strategy validation state tracking
  const [strategyValidationError, setStrategyValidationError] = useState<StrategyValidationError | null>(null);
  const [lastValidationTimestamp, setLastValidationTimestamp] = useState<number>(0);

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

  // ========== APPROVAL MANAGEMENT ==========
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
  // PHASE 2: Enhanced execution gate with strict validation
  const canExecuteSwap = useMemo(() => {
    console.log('🔒 PHASE 2: Checking execution gates...', {
      strategyValid: strategyValidation.canProceedWithSwap,
      strategyLevel: strategyValidation.validationLevel,
      blockingErrors: strategyValidation.blockingErrors.length,
      approvals: canProceedWithApprovals,
      validating: isValidatingStrategy,
      setting: isSettingUpStrategy,
      checking: isCheckingApprovals,
      approving: isApprovingTokens,
      status: executionStatus
    });

    // PHASE 2: Strict blocking conditions
    const hasBlockingErrors = strategyValidation.blockingErrors.length > 0;
    const hasStrategyErrors = strategyValidation.errors.length > 0 && !disableSavings;
    const isValidationFailed = strategyValidation.validationLevel === 'failed';
    const needsSetup = strategyValidation.needsSetup && !disableSavings;
    
    // Block if any critical conditions are not met
    const canProceed = strategyValidation.canProceedWithSwap && 
           canProceedWithApprovals &&
           !hasBlockingErrors &&
           !isValidationFailed &&
           !needsSetup &&
           !isValidatingStrategy && 
           !isSettingUpStrategy &&
           !isCheckingApprovals &&
           !isApprovingTokens &&
           executionStatus !== 'validating-strategy' &&
           executionStatus !== 'setting-strategy' &&
           executionStatus !== 'checking-approvals' &&
           executionStatus !== 'approving-tokens';

    if (!canProceed) {
      console.log('🚫 PHASE 2: Execution blocked:', {
        reason: hasBlockingErrors ? 'Blocking errors' :
                isValidationFailed ? 'Validation failed' :
                needsSetup ? 'Strategy setup required' :
                'Other validation issues'
      });
    } else {
      console.log('✅ PHASE 2: Execution gates passed');
    }

    return canProceed;
  }, [
    strategyValidation, 
    canProceedWithApprovals,
    disableSavings,
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

  // PHASE 2: Enhanced comprehensive strategy validation
  const validateStrategy = useCallback(async (): Promise<StrategyValidationResult> => {
    console.log('🔍 PHASE 2: Starting comprehensive strategy validation...');
    
    if (!address || disableSavings) {
      console.log('✅ PHASE 2: Savings disabled or no address - validation passed');
      return {
        isValid: true,
        needsSetup: false,
        errors: [],
        warnings: [],
        canProceedWithSwap: true,
        validationLevel: 'none',
        blockingErrors: [],
        recommendations: []
      };
    }

    setIsValidatingStrategy(true);
    setStrategyValidationError(null);
    
    const result: StrategyValidationResult = {
      isValid: false,
      needsSetup: false,
      errors: [],
      warnings: [],
      canProceedWithSwap: false,
      validationLevel: 'basic',
      blockingErrors: [],
      recommendations: []
    };

    try {
      console.log('📋 PHASE 2: Fetching user strategy configuration...');
      const strategyContract = await getSavingStrategyContract();
      const userStrategy = await strategyContract.getUserSavingStrategy(address);
      
      // PHASE 2: Comprehensive strategy validation checks
      
      // 1. Check if strategy is configured at all
      if (!userStrategy.percentage || userStrategy.percentage.eq(0)) {
        result.needsSetup = true;
        result.blockingErrors.push('STRATEGY_NOT_CONFIGURED: No savings percentage configured');
        result.errors.push('Savings strategy not configured. Please set up your savings strategy before swapping.');
        result.recommendations.push('Click "Set Up Strategy" to configure your savings percentage');
        setStrategyValidationError('STRATEGY_NOT_CONFIGURED');
        console.log('❌ PHASE 2: Strategy not configured');
      } else {
        console.log('✅ PHASE 2: Strategy found, validating configuration...');
        const percentage = userStrategy.percentage.toNumber() / 100; // Convert from basis points
        
        // 2. Validate percentage ranges
        if (percentage < 1) {
          result.warnings.push(`Low savings percentage (${percentage}%). Consider 5-10% for meaningful savings.`);
          result.recommendations.push('Increase savings percentage to 5-10% for better results');
          if (percentage < 0.1) {
            result.blockingErrors.push('PERCENTAGE_TOO_LOW: Savings percentage below minimum threshold');
            result.errors.push('Savings percentage too low (<0.1%). Please increase to at least 1%.');
            setStrategyValidationError('PERCENTAGE_TOO_LOW');
          }
        }
        
        if (percentage > 50) {
          result.blockingErrors.push('PERCENTAGE_TOO_HIGH: Savings percentage exceeds safety limit');
          result.errors.push('Savings percentage too high (>50%). Please reduce for safety.');
          setStrategyValidationError('PERCENTAGE_TOO_HIGH');
          console.log('❌ PHASE 2: Percentage too high:', percentage + '%');
        }
        
        // 3. Validate specific token configuration
        if (userStrategy.savingsTokenType === 2) { // SPECIFIC token type
          if (!userStrategy.specificSavingsToken || userStrategy.specificSavingsToken === ethers.constants.AddressZero) {
            result.blockingErrors.push('SPECIFIC_TOKEN_MISSING: Specific savings token not configured');
            result.errors.push('Specific savings token not configured. Please set a target token.');
            result.recommendations.push('Configure a specific token for your savings strategy');
            setStrategyValidationError('SPECIFIC_TOKEN_MISSING');
            console.log('❌ PHASE 2: Specific token missing');
          }
        }
        
        // 4. Validate swap amount vs savings configuration
        if (amount && parseFloat(amount) > 0) {
          const swapAmount = parseFloat(amount);
          const savingsAmount = (swapAmount * percentage) / 100;
          
          if (savingsAmount < 0.001 && fromToken === 'ETH') {
            result.warnings.push(`Very small savings amount (${savingsAmount.toFixed(6)} ETH). Consider larger swap or higher percentage.`);
            result.recommendations.push('Increase swap amount or savings percentage for meaningful savings');
          }
          
          if (savingsAmount > swapAmount * 0.5) {
            result.blockingErrors.push('INVALID_CONFIGURATION: Savings amount exceeds reasonable limit');
            result.errors.push('Savings configuration would save more than 50% of swap. Please adjust.');
            setStrategyValidationError('INVALID_CONFIGURATION');
          }
        }
        
        // 5. Check for strategy conflicts
        if (userStrategy.enableDCA && userStrategy.savingsTokenType === 0) {
          result.warnings.push('DCA enabled with input token savings. Output or specific token recommended for DCA.');
          result.recommendations.push('Consider changing to output token savings for better DCA performance');
        }
        
        // 6. Final validation
        if (result.blockingErrors.length === 0) {
          result.isValid = true;
          result.canProceedWithSwap = true;
          result.validationLevel = 'comprehensive';
          console.log('✅ PHASE 2: Strategy validation passed:', {
            percentage: percentage + '%',
            type: userStrategy.savingsTokenType,
            dca: userStrategy.enableDCA
          });
        } else {
          result.validationLevel = 'failed';
          console.log('❌ PHASE 2: Strategy validation failed:', result.blockingErrors);
        }
      }

    } catch (error) {
      console.error('❌ PHASE 2: Strategy validation error:', error);
      result.blockingErrors.push('STRATEGY_VALIDATION_FAILED: Network or contract error');
      result.errors.push('Failed to validate strategy. Please check your connection and try again.');
      result.validationLevel = 'failed';
      setStrategyValidationError('STRATEGY_VALIDATION_FAILED');
    }

    setIsValidatingStrategy(false);
    setLastValidationTimestamp(Date.now());
    
    console.log('📊 PHASE 2: Validation result:', {
      isValid: result.isValid,
      canProceed: result.canProceedWithSwap,
      errors: result.errors.length,
      warnings: result.warnings.length,
      level: result.validationLevel
    });
    
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

  // ========== VALIDATION EFFECTS ==========
  useEffect(() => {
    if (props && fromToken === toToken) {
      setError(new Error('From and To tokens must be different'));
    } else {
      setError(null);
    }
  }, [props, fromToken, toToken]);

  // PHASE 2: Enhanced strategy validation effect with caching
  useEffect(() => {
    if (props && address && !disableSavings) {
      // PHASE 2: Add validation caching to prevent excessive calls
      const now = Date.now();
      const cacheTimeout = 30000; // 30 seconds cache
      
      if (now - lastValidationTimestamp > cacheTimeout) {
        console.log('🔄 PHASE 2: Triggering strategy validation...');
        validateStrategy().then(setStrategyValidation);
      }
    } else if (disableSavings) {
      console.log('✅ PHASE 2: Savings disabled - setting default validation');
      setStrategyValidation({
        isValid: true,
        needsSetup: false,
        errors: [],
        warnings: [],
        canProceedWithSwap: true,
        validationLevel: 'none',
        blockingErrors: [],
        recommendations: []
      });
    }
  }, [address, disableSavings, validateStrategy, props, lastValidationTimestamp]);

  // PHASE 2: Add validation refresh when amount changes significantly
  useEffect(() => {
    if (props && address && !disableSavings && amount && parseFloat(amount) > 0) {
      const currentAmount = parseFloat(amount);
      // Re-validate if amount changes by more than 10%
      if (Math.abs(currentAmount - parseFloat(actualSwapAmount || '0')) > currentAmount * 0.1) {
        console.log('🔄 PHASE 2: Amount changed significantly, re-validating strategy...');
        validateStrategy().then(setStrategyValidation);
      }
    }
  }, [amount, actualSwapAmount, address, disableSavings, validateStrategy, props]);

  // ========== GAS ESTIMATION EFFECT ==========
  useEffect(() => {
    if (!props || !amount || parseFloat(amount) <= 0) return;

    const valueToSend = fromToken === 'ETH' ? BigInt(parseUnits(amount, 18)) : BigInt(0);
    
    const { gasLimit, usingFallback, sizeCategory: txSizeCategory } = calculateV4SwapGasLimit({
      fromToken,
      toToken,
      value: valueToSend,
      savingsTokenType: strategy.savingsTokenType,
      enableDCA: strategy.enableDCA,
      disableSavings
    });

    const gasPrice = BigInt(30) * BigInt(1000000000); // 30 gwei
    const gasEstimateWei = gasLimit * gasPrice;
    const gasEstimateEth = (Number(gasEstimateWei) / 1e18).toString();
    
    setEstimatedGasLimit(Number(gasLimit));
    setUsingFallbackGas(usingFallback);
    setGasEstimate(gasEstimateEth);
    setSizeCategory(txSizeCategory);
  }, [
    props,
    fromToken,
    toToken,
    amount,
    strategy.savingsTokenType,
    strategy.enableDCA,
    disableSavings
  ]);

  // ========== PHASE 2: ENHANCED SWAP EXECUTION WITH BLOCKING VALIDATION ==========
  const executeSwapFunction = async () => {
    console.log('🚀 PHASE 2: Starting swap execution with enhanced validation...');
    
    if (!props || !address || !amount || parseFloat(amount) <= 0) {
      throw new Error('Invalid swap parameters');
    }

    // PHASE 2: Pre-execution validation gate
    console.log('🔒 PHASE 2: Checking pre-execution gates...');
    if (!canExecuteSwap) {
      if (strategyValidation.blockingErrors.length > 0) {
        const primaryError = strategyValidation.blockingErrors[0];
        const errorType = primaryError.split(':')[0];
        
        switch (errorType) {
          case 'STRATEGY_NOT_CONFIGURED':
            throw new Error('Strategy Setup Required: Please configure your savings strategy before swapping. Use the strategy setup modal to get started.');
          case 'PERCENTAGE_TOO_LOW':
            throw new Error('Invalid Strategy: Savings percentage too low. Please increase to at least 1%.');
          case 'PERCENTAGE_TOO_HIGH':
            throw new Error('Invalid Strategy: Savings percentage too high (>50%). Please reduce for safety.');
          case 'SPECIFIC_TOKEN_MISSING':
            throw new Error('Incomplete Strategy: Specific savings token not configured. Please set a target token.');
          case 'INVALID_CONFIGURATION':
            throw new Error('Strategy Configuration Error: Please review and update your savings settings.');
          default:
            throw new Error('Strategy Validation Failed: Please check your savings configuration.');
        }
      }
      
      if (strategyValidation.needsSetup && !disableSavings) {
        throw new Error('Strategy Setup Required: Please set up your savings strategy to continue.');
      }
      
      throw new Error('Cannot execute swap: Validation requirements not met.');
    }

    // PHASE 2: Comprehensive strategy validation
    setExecutionStatus('validating-strategy');
    console.log('🔍 PHASE 2: Performing final strategy validation...');
    const currentValidation = await validateStrategy();
    setStrategyValidation(currentValidation);
    
    // PHASE 2: Strict validation enforcement
    if (!currentValidation.canProceedWithSwap) {
      const errorMsg = currentValidation.blockingErrors.length > 0 
        ? currentValidation.blockingErrors.join(', ') 
        : currentValidation.errors.join(', ') || 'Strategy validation failed';
      
      console.error('❌ PHASE 2: Strategy validation failed:', errorMsg);
      setExecutionStatus('error');
      throw new Error(`PHASE 2 Strategy Error: ${errorMsg}`);
    }
    
    // PHASE 2: Enhanced blocking for specific conditions
    if (!disableSavings) {
      if (currentValidation.validationLevel === 'failed') {
        setExecutionStatus('error');
        throw new Error('PHASE 2 Strategy Error: Strategy validation failed. Please review your configuration.');
      }
      
      if (currentValidation.blockingErrors.length > 0) {
        setExecutionStatus('error');
        throw new Error(`PHASE 2 Strategy Error: ${currentValidation.blockingErrors.join(', ')}`);
      }
    }
    
    if (currentValidation.warnings.length > 0) {
      console.warn('⚠️ PHASE 2: Strategy warnings (non-blocking):', currentValidation.warnings);
    }

    // PHASE 2: Approval validation
    if (needsApprovals && !canProceedWithApprovals) {
      console.error('❌ PHASE 2: Approval validation failed');
      setExecutionStatus('error');
      throw new Error(`PHASE 2 Approval Error: Token approvals required for swapping and savings functionality`);
    }

    console.log('✅ PHASE 2: All validation gates passed, proceeding with swap...');
    setExecutionStatus('preparing');
    setError(null);
    
    if (!signer) {
      throw new Error('Wallet connection is required. Please connect your wallet first.');
    }

    const fromTokenInfo = getTokenBySymbol(fromToken);
    if (!fromTokenInfo) {
      throw new Error('Invalid from token');
    }

    const cliInstance = await ensureClient();
    
    if (!cliInstance.signer) {
      throw new Error('Signer not available. Please reconnect your wallet.');
    }

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