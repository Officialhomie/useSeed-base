import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAccount, useWaitForTransactionReceipt } from 'wagmi';
import { parseUnits } from 'viem';
import { useEthersSigner } from './useEthersSigner';
import { getEthersProvider } from '../utils/ethersAdapter';
import { UniswapV4Client } from '../uniswap/UniswapV4Client';
import { SpendSaveStrategy } from './useSpendSaveStrategy';
import { SupportedTokenSymbol, getTokenBySymbol } from '../uniswap/tokens';
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

interface RealTimeEventData {
  eventName: string;
  data: any;
  timestamp: number;
  processed: boolean;
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
}

interface SwapExecutionResult {
  gasOptimizationAchieved?: boolean;
  gasOptimized?: boolean;
  // Allow any other properties (for compatibility)
  [key: string]: any;
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

  // PHASE 3: Real-time event features
  realTimeEvents: RealTimeEventData[];
  eventListenerStatus: 'inactive' | 'listening' | 'completed' | 'error';
  onSavingsProcessed?: (callback: (data: any) => void) => void;
  onDCAQueued?: (callback: (data: any) => void) => void;
  onSwapError?: (callback: (data: any) => void) => void;
  cleanupEventListeners?: () => void;
  
  // PHASE 4: DCA integration features
  dcaQueueStatus: 'idle' | 'checking' | 'processing' | 'completed' | 'error';
  dcaQueueLength: number;
  dcaProcessingResults: Array<{
    index: number;
    status: 'pending' | 'success' | 'failed';
    txHash?: string;
    error?: string;
    fromToken: string;
    toToken: string;
    amount: string;
  }>;
  isDcaProcessing: boolean;
  processDCAQueue: () => Promise<void>;
  getDCAQueueInfo: () => Promise<{length: number; items: any[]}>;
  clearDCAResults: () => void;

  // V4-specific returns
  v4Quote: {
    amountOut: string;
    gasEstimate: string;
    priceImpact: number;
    route: string;
  } | null;
  v4ContractsValid: boolean;
  v4QuoteAvailable: boolean;
  v4GasOptimized: boolean;
  estimatedGasSavings: string | null;
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
  const [client, setClient] = useState<UniswapV4Client | null>(null);
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

  // PHASE 3: Real-time event state management
  const [realTimeEvents, setRealTimeEvents] = useState<RealTimeEventData[]>([]);
  const [eventListenerStatus, setEventListenerStatus] = useState<'inactive' | 'listening' | 'completed' | 'error'>('inactive');
  const [eventCleanupFunction, setEventCleanupFunction] = useState<(() => void) | null>(null);

  // PHASE 4: DCA state management
  const [dcaQueueStatus, setDcaQueueStatus] = useState<'idle' | 'checking' | 'processing' | 'completed' | 'error'>('idle');
  const [dcaQueueLength, setDcaQueueLength] = useState<number>(0);
  const [dcaProcessingResults, setDcaProcessingResults] = useState<Array<{
    index: number;
    status: 'pending' | 'success' | 'failed';
    txHash?: string;
    error?: string;
    fromToken: string;
    toToken: string;
    amount: string;
  }>>([]);
  const [isDcaProcessing, setIsDcaProcessing] = useState(false);

  const [v4QuoteResult, setV4QuoteResult] = useState<{
    amountOut: string;
    gasEstimate: string;
    priceImpact: number;
    route: string;
  } | null>(null);
  
  const [v4ValidationStatus, setV4ValidationStatus] = useState<{
    contractsValid: boolean;
    quoteAvailable: boolean;
    gasOptimized: boolean;
  }>({
    contractsValid: false,
    quoteAvailable: false,
    gasOptimized: false
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

  // ========== PHASE 4: DCA MANAGEMENT ==========
  const getDCAContract = useCallback(async () => {
    if (!signer) throw new Error('Signer not available for DCA operations');
    
    // Import DCA ABI (assuming it exists)
    const DCAModuleABI = await import('@/abi/trading/DCA.json');
    return new ethers.Contract(
      CONTRACT_ADDRESSES.DCA,
      DCAModuleABI.default,
      signer
    );
  }, [signer]);

  const getSpendSaveStorageContract = useCallback(async () => {
    if (!signer) throw new Error('Signer not available for storage operations');
    
    const SpendSaveStorageABI = await import('@/abi/core/SpendSaveStorage.json');
    return new ethers.Contract(
      CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE,
      SpendSaveStorageABI.default,
      signer
    );
  }, [signer]);

  // ========== SAVINGS PREVIEW ==========
  const savingsPreview = useSavingsPreview(
    amount,
    fromToken,
    strategy,
    overridePercentage,
    disableSavings
  );

  // ========== REAL-TIME EVENT LISTENING ==========
  const addEventCallback = useCallback((eventName: string, callback: (data: any) => void) => {
    if (client) {
      // Add callback to UniswapV4Client's event system
      const eventCallbacks = (client as any).eventCallbacks;
      if (eventCallbacks) {
        if (!eventCallbacks.has(eventName)) {
          eventCallbacks.set(eventName, []);
        }
        eventCallbacks.get(eventName).push(callback);
      }
    }
  }, [client]);

  const onSavingsProcessed = useCallback((callback: (data: any) => void) => {
    addEventCallback('OutputSavingsProcessed', (data) => {
      console.log('💰 PHASE 3: Savings processed callback triggered:', data);
      setRealTimeEvents(prev => [...prev, {
        eventName: 'OutputSavingsProcessed',
        data,
        timestamp: Date.now(),
        processed: false
      }]);
      callback(data);
    });
    
    addEventCallback('InputTokenSaved', (data) => {
      console.log('💰 PHASE 3: Input token saved callback triggered:', data);
      setRealTimeEvents(prev => [...prev, {
        eventName: 'InputTokenSaved',
        data,
        timestamp: Date.now(),
        processed: false
      }]);
      callback(data);
    });
  }, [addEventCallback]);

  const onDCAQueued = useCallback((callback: (data: any) => void) => {
    addEventCallback('SpecificTokenSwapQueued', (data) => {
      console.log('🔄 PHASE 3: DCA queued callback triggered:', data);
      setRealTimeEvents(prev => [...prev, {
        eventName: 'SpecificTokenSwapQueued',
        data,
        timestamp: Date.now(),
        processed: false
      }]);
      callback(data);
    });
  }, [addEventCallback]);

  const onSwapError = useCallback((callback: (data: any) => void) => {
    addEventCallback('AfterSwapError', (data) => {
      console.error('❌ PHASE 3: Swap error callback triggered:', data);
      setRealTimeEvents(prev => [...prev, {
        eventName: 'AfterSwapError',
        data,
        timestamp: Date.now(),
        processed: false
      }]);
      callback(data);
    });

    addEventCallback('BeforeSwapError', (data) => {
      console.error('❌ PHASE 3: Before swap error callback triggered:', data);
      setRealTimeEvents(prev => [...prev, {
        eventName: 'BeforeSwapError',
        data,
        timestamp: Date.now(),
        processed: false
      }]);
      callback(data);
    });
  }, [addEventCallback]);

  const cleanupEventListeners = useCallback(() => {
    console.log('🧹 PHASE 3: Cleaning up event listeners from hook...');
    if (eventCleanupFunction) {
      eventCleanupFunction();
      setEventCleanupFunction(null);
    }
    setEventListenerStatus('completed');
    setRealTimeEvents([]);
  }, [eventCleanupFunction]);

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

  // ========== PHASE 4: DCA Queue Processing Functions ==========
  const getDCAQueueInfo = useCallback(async (): Promise<{length: number; items: any[]}> => {
    if (!address) throw new Error('User address not available');
    
    try {
      console.log('📋 PHASE 4: Fetching DCA queue information...');
      const storageContract = await getSpendSaveStorageContract();
      
      const queueLength = await storageContract.getDcaQueueLength(address);
      const length = queueLength.toNumber();
      
      console.log('📊 PHASE 4: DCA queue length:', length);
      setDcaQueueLength(length);
      
      const items = [];
      for (let i = 0; i < length; i++) {
        try {
          const item = await storageContract.getDcaQueueItem(address, i);
          items.push({
            index: i,
            fromToken: item.fromToken,
            toToken: item.toToken,
            amount: item.amount.toString(),
            executed: item.executed,
            deadline: item.deadline.toNumber(),
            customSlippageTolerance: item.customSlippageTolerance.toNumber()
          });
        } catch (error) {
          console.warn(`Failed to fetch DCA queue item ${i}:`, error);
        }
      }
      
      return { length, items };
    } catch (error) {
      console.error('❌ PHASE 4: Failed to get DCA queue info:', error);
      throw error;
    }
  }, [address, getSpendSaveStorageContract]);

  const processDCAQueue = useCallback(async (): Promise<void> => {
    if (!address || !signer) {
      throw new Error('Wallet not connected for DCA processing');
    }

    console.log('🔄 PHASE 4: Starting DCA queue processing...');
    setDcaQueueStatus('checking');
    setIsDcaProcessing(true);
    setDcaProcessingResults([]);

    try {
      // Get current queue info
      const { length, items } = await getDCAQueueInfo();
      
      if (length === 0) {
        console.log('✅ PHASE 4: No DCA items to process');
        setDcaQueueStatus('completed');
        setIsDcaProcessing(false);
        return;
      }

      console.log(`🔄 PHASE 4: Processing ${length} DCA queue items...`);
      setDcaQueueStatus('processing');

      const dcaContract = await getDCAContract();
      const results: typeof dcaProcessingResults = [];

      // Process each unexecuted item
      for (const item of items) {
        if (item.executed) {
          console.log(`⏭️ PHASE 4: Skipping already executed DCA item ${item.index}`);
          continue;
        }

        console.log(`🔄 PHASE 4: Processing DCA item ${item.index}:`, {
          fromToken: item.fromToken,
          toToken: item.toToken,
          amount: item.amount
        });

        const resultItem: {
          index: number;
          status: 'pending' | 'success' | 'failed';
          txHash?: string;
          error?: string;
          fromToken: string;
          toToken: string;
          amount: string;
        } = {
          index: item.index,
          status: 'pending',
          fromToken: item.fromToken,
          toToken: item.toToken,
          amount: item.amount
        };
        
        results.push(resultItem);
        setDcaProcessingResults([...results]);

        try {
          // Create pool key for DCA swap
          const storageContract = await getSpendSaveStorageContract();
          const poolKey = await storageContract.createPoolKey(item.fromToken, item.toToken);
          
          // Determine swap direction
          const zeroForOne = item.fromToken.toLowerCase() < item.toToken.toLowerCase();
          
          // Execute DCA swap
          console.log(`🚀 PHASE 4: Executing DCA swap for item ${item.index}...`);
          const tx = await dcaContract.executeDCASwap(
            address,
            item.fromToken,
            item.toToken,
            item.amount,
            poolKey,
            zeroForOne,
            item.customSlippageTolerance || 50 // Default 0.5% slippage
          );

          console.log(`⏳ PHASE 4: DCA swap transaction sent: ${tx.hash}`);
          resultItem.txHash = tx.hash; // Property 'txHash' does not exist on type '{ index: any; status: "pending"; fromToken: any; toToken: any; amount: any; }'.ts(2339)
          setDcaProcessingResults([...results]);

          // Wait for confirmation
          const receipt = await tx.wait();
          
          if (receipt.status === 1) {
            console.log(`✅ PHASE 4: DCA swap ${item.index} completed successfully`);
            resultItem.status = 'success'; // Type '"success"' is not assignable to type '"pending"'.ts(2322)

            
            // Mark as executed in storage
            const storageContract = await getSpendSaveStorageContract();
            await storageContract.markDcaExecuted(address, item.index);
            
          } else {
            throw new Error('Transaction failed');
          }

        } catch (error) {
          console.error(`❌ PHASE 4: DCA swap ${item.index} failed:`, error);
          resultItem.status = 'failed'; // Type '"failed"' is not assignable to type '"pending"'.ts(2322)
          resultItem.error = error instanceof Error ? error.message : String(error); // Property 'error' does not exist on type '{ index: any; status: "pending"; fromToken: any; toToken: any; amount: any; }'.ts(2339)
        }

        setDcaProcessingResults([...results]);
      }

      // Final status update
      const hasFailures = results.some(r => r.status === 'failed');
      if (hasFailures) {
        console.log('⚠️ PHASE 4: DCA processing completed with some failures');
        setDcaQueueStatus('error');
      } else {
        console.log('✅ PHASE 4: All DCA swaps processed successfully');
        setDcaQueueStatus('completed');
      }

    } catch (error) {
      console.error('❌ PHASE 4: DCA queue processing failed:', error);
      setDcaQueueStatus('error');
      throw error;
    } finally {
      setIsDcaProcessing(false);
    }
  }, [address, signer, getDCAQueueInfo, getDCAContract, getSpendSaveStorageContract]);

  const clearDCAResults = useCallback(() => {
    console.log('🧹 PHASE 4: Clearing DCA processing results');
    setDcaProcessingResults([]);
    setDcaQueueStatus('idle');
    setDcaQueueLength(0);
  }, []);

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


  const validateStrategy = useCallback(async (): Promise<StrategyValidationResult> => {
    
    if (!address || disableSavings) {
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
      const strategyContract = await getSavingStrategyContract();
      const userStrategy = await strategyContract.getUserSavingStrategy(address);
      
      if (!userStrategy.percentage || userStrategy.percentage.eq(0)) {
        result.needsSetup = true;
        result.blockingErrors.push('STRATEGY_NOT_CONFIGURED: No savings percentage configured');
        result.errors.push('Savings strategy not configured. Please set up your savings strategy before swapping.');
        result.recommendations.push('Click "Set Up Strategy" to configure your savings percentage');
        setStrategyValidationError('STRATEGY_NOT_CONFIGURED');
      } else {
        const percentage = userStrategy.percentage.toNumber() / 100;
        
        // ✅ ADD: Enhanced validation rules
        if (percentage < 1) {
          result.blockingErrors.push('PERCENTAGE_TOO_LOW: Savings percentage below minimum threshold');
          result.errors.push('Savings percentage too low (<1%). Please increase to at least 1%.');
          setStrategyValidationError('PERCENTAGE_TOO_LOW');
        }
        
        if (percentage > 50) {
          result.blockingErrors.push('PERCENTAGE_TOO_HIGH: Savings percentage exceeds safety limit');
          result.errors.push('Savings percentage too high (>50%). Please reduce for safety.');
          setStrategyValidationError('PERCENTAGE_TOO_HIGH');
        }
        
        // ✅ ADD: Max percentage validation
        const maxPercentage = userStrategy.maxPercentage.toNumber() / 100;
        if (maxPercentage < percentage) {
          result.blockingErrors.push('INVALID_MAX_PERCENTAGE: Max percentage less than current percentage');
          result.errors.push('Maximum percentage must be greater than or equal to current percentage.');
          setStrategyValidationError('INVALID_CONFIGURATION');
        }
        
        // ✅ ENHANCE: Specific token validation  
        if (userStrategy.savingsTokenType === 2) {
          if (!userStrategy.specificSavingsToken || userStrategy.specificSavingsToken === ethers.constants.AddressZero) {
            result.blockingErrors.push('SPECIFIC_TOKEN_MISSING: Specific savings token not configured');
            result.errors.push('Specific savings token not configured. Please set a target token.');
            result.recommendations.push('Configure a specific token for your savings strategy');
            setStrategyValidationError('SPECIFIC_TOKEN_MISSING');
          }
        }
        
        // ✅ ADD: Amount-specific validation
        if (amount && parseFloat(amount) > 0) {
          const swapAmount = parseFloat(amount);
          const savingsAmount = (swapAmount * percentage) / 100;
          
          if (savingsAmount < 0.001 && fromToken === 'ETH') {
            result.warnings.push(`Very small savings amount (${savingsAmount.toFixed(6)} ETH). Consider larger swap or higher percentage.`);
          }
          
          if (savingsAmount > swapAmount * 0.5) {
            result.blockingErrors.push('INVALID_CONFIGURATION: Savings amount exceeds reasonable limit');
            result.errors.push('Savings configuration would save more than 50% of swap. Please adjust.');
            setStrategyValidationError('INVALID_CONFIGURATION');
          }
        }
        
        if (result.blockingErrors.length === 0) {
          result.isValid = true;
          result.canProceedWithSwap = true;
          result.validationLevel = 'comprehensive';
        } else {
          result.validationLevel = 'failed';
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

  // PHASE 4: Auto-trigger DCA processing after successful swap with savings
  useEffect(() => {
    if (isSuccess && !disableSavings && transactionHash) {
      console.log('🔄 PHASE 4: Swap successful, checking for DCA processing...');
      
      // Check if user has DCA enabled in strategy
      if (strategy.enableDCA) {
        console.log('🔄 PHASE 4: DCA enabled in strategy, processing queue...');
        
        // Wait a bit for savings events to complete, then process DCA
        const dcaTimeout = setTimeout(async () => {
          try {
            await processDCAQueue();
          } catch (error) {
            console.error('❌ PHASE 4: Auto DCA processing failed:', error);
          }
        }, 3000); // 3 second delay to ensure savings events are processed

        return () => clearTimeout(dcaTimeout);
      } else {
        console.log('ℹ️ PHASE 4: DCA not enabled in strategy, skipping queue processing');
      }
    }
  }, [isSuccess, disableSavings, transactionHash, strategy.enableDCA, processDCAQueue]);

  // PHASE 4: DCA event monitoring integration
  const onDCAProcessed = useCallback((callback: (data: any) => void) => {
    addEventCallback('DCASwapExecuted', (data) => {
      console.log('🔄 PHASE 4: DCA swap executed callback triggered:', data);
      
      setRealTimeEvents(prev => [...prev, {
        eventName: 'DCASwapExecuted',
        data,
        timestamp: Date.now(),
        processed: false
      }]);
      
      callback(data);
    });
  }, [addEventCallback]);

  // PHASE 3: Auto-cleanup on unmount
  useEffect(() => {
    return () => {
      if (eventCleanupFunction) {
        console.log('🧹 PHASE 3: Auto-cleanup on unmount');
        eventCleanupFunction();
      }
    };
  }, [eventCleanupFunction]);


  // ========== PHASE 2: ENHANCED SWAP EXECUTION WITH BLOCKING VALIDATION ==========
  const executeSwapFunction = async () => {
    console.log('Starting V4 swap with Universal Router...');
    
    if (!props || !address || !amount || parseFloat(amount) <= 0) {
      throw new Error('Invalid swap parameters');
    }

    // PHASE 2: Pre-execution validation gate
    console.log(' Checking pre-execution gates...');
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
      console.log('🔍 Getting V4 quote before execution...');
      setExecutionStatus('preparing');
      
      // Get quote first for better UX
      try {
        const quote = await cliInstance.getV4Quote({
          fromToken,
          toToken,
          amountIn: actualSwapAmount,
          hookData: ethers.utils.defaultAbiCoder.encode(['address'], [address])
        });
        
        setV4QuoteResult(quote);
        setV4ValidationStatus(prev => ({ ...prev, quoteAvailable: true }));
        console.log('✅ V4 quote received:', quote);
      } catch (quoteError) {
        console.warn('⚠️ V4 quote failed, proceeding without quote:', quoteError);
        setV4ValidationStatus(prev => ({ ...prev, quoteAvailable: false }));
      }

      const slippageBps = Math.floor(slippage * 100);
      console.log('🚀 Executing V4 swap via Universal Router...');
      setExecutionStatus('pending');
      
      const txResponse = await cliInstance.executeSwap({
        fromToken,
        toToken,
        amountRaw: actualSwapAmount,
        slippageBps,
        disableSavings,
      });

      const txHash = txResponse.hash as `0x${string}`;
      setTransactionHash(txHash);
      setSavedAmount(savingsPreview.rawAmount);
      

      // if (txResponse.gasOptimized) {
      //   setV4ValidationStatus(prev => ({ ...prev, gasOptimized: true }));
      // }

      // PHASE 3: Set up event listener cleanup and real-time monitoring
      if (txResponse.eventListeners) {
        setEventCleanupFunction(() => txResponse.eventListeners!.cleanup);
        setEventListenerStatus(txResponse.eventListeners.status);
        
        console.log('🎧 PHASE 3: Event listeners active, monitoring real-time events...');
      }

      // PHASE 4: Set up DCA processing trigger
      console.log('🔄 PHASE 4: Setting up post-swap DCA processing...');
    } catch (swapError) {
      const errorMessage = swapError instanceof Error ? swapError.message : String(swapError);

      if (errorMessage.includes('V4 Slippage Error')) {
        throw new Error('Output amount below expected minimum. Try increasing slippage tolerance or reducing trade size.');
      } else if (errorMessage.includes('V4 Input Error')) {
        throw new Error('Trade size too large for available liquidity. Try a smaller amount.');
      } else if (errorMessage.includes('V4 Settlement Error')) {
        throw new Error('Token settlement failed. This may be due to insufficient liquidity or hook execution issues.');
      } else if (errorMessage.includes('V4 Authorization Error')) {
        throw new Error('Hook authorization failed. Please check your SpendSave configuration.');
      } else if (errorMessage.includes('V4 State Error')) {
        throw new Error('Pool manager temporarily locked. Please wait a moment and try again.');
      } else if (errorMessage.includes('V4 Execution Error')) {
        throw new Error('Transaction execution failed. This may be due to insufficient liquidity or network congestion.');
      }
      
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
    savingsPreview,
    // PHASE 2: Strategy-related returns
    strategyValidation,
    isValidatingStrategy,
    isSettingUpStrategy,
    setupStrategy,
    canExecuteSwap,
    strategySetupRequired,
    // PHASE 3: Approval-related returns
    approvalStatus,
    approvalState,
    isCheckingApprovals,
    isApprovingTokens,
    needsApprovals,
    approveAllTokens,
    refreshApprovals,
    canProceedWithApprovals,
    // PHASE 3: Real-time event returns
    realTimeEvents,
    eventListenerStatus,
    onSavingsProcessed,
    onDCAQueued,
    onSwapError,
    cleanupEventListeners,
    // 🆕 V4-specific returns:
    v4Quote: v4QuoteResult,
    v4ContractsValid: v4ValidationStatus.contractsValid,
    v4QuoteAvailable: v4ValidationStatus.quoteAvailable,
    v4GasOptimized: v4ValidationStatus.gasOptimized,
    estimatedGasSavings: v4ValidationStatus.gasOptimized ? '~40-50%' : null,

    // PHASE 4: DCA integration returns
    dcaQueueStatus,
    dcaQueueLength,
    dcaProcessingResults,
    isDcaProcessing,
    processDCAQueue,
    getDCAQueueInfo,
    clearDCAResults
  };
}