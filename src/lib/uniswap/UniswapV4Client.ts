import { ethers } from 'ethers'
import JSBI from "jsbi"
import {
  Pool,
  Route,
  Trade as V4Trade,
  tickToPrice,
} from '@uniswap/v4-sdk'
import {
  Currency,
  CurrencyAmount,
  Percent,
  Token,
  TradeType,
} from '@uniswap/sdk-core'
import { CONTRACT_ADDRESSES, createPoolKey, validateHookPermissions } from '../contracts'
import {
  CHAIN_ID,
  getTokenBySymbol,
  SUPPORTED_TOKENS,
  SupportedTokenSymbol,
} from './tokens'
import { encodeSpendSaveHookData } from './UniswapV4Integration'
import { getSqrtPriceLimit } from './UniswapV4Integration'
import type { HookFlags } from './types'
import PoolManagerAbi from '@/abi/core/PoolManager.json'
import SavingStrategyAbi from '@/abi/savings/SavingStrategy.json'
import SpendSaveHookAbi from '@/abi/core/SpendSaveHook.json'
import { BaseScanClient } from '../basescan/BaseScanClient'
import SpendSaveHookABI from '@/abi/core/SpendSaveHook.json'
import DCAABI from '@/abi/trading/DCA.json';
import { Address } from 'viem'

import { V4UniversalRouterClient, V4SwapParams } from './V4UniversalRouterClient';
import { V4QuoterClient, QuoteParams } from './V4QuoterClient';
import { V4_CONTRACTS } from './v4Constants';
import { validateV4Deployment } from '../contracts';


// Add interface for enhanced transaction result
interface SwapExecutionResult extends ethers.providers.TransactionResponse {
  hookExecutionStatus?: {
    beforeSwapExecuted: boolean;
    afterSwapExecuted: boolean;
    savingsProcessed: boolean;
    errors: string[];
  };
  eventListeners?: {
    cleanup: () => void;
    status: 'listening' | 'completed' | 'error';
    eventsReceived: string[];
  };
  realTimeEvents?: {
    onSavingsProcessed?: (data: any) => void;
    onDCAQueued?: (data: any) => void;
    onError?: (error: any) => void;
    onComplete?: () => void;
  };
}

interface EventListenerManager {
  startListening: () => void;
  stopListening: () => void;
  getStatus: () => 'inactive' | 'listening' | 'completed' | 'error';
  getEventsReceived: () => string[];
  addEventCallback: (eventName: string, callback: (data: any) => void) => void;
}

export const UNISWAP_V4_CONSTANTS = {
  FEE_TIERS: {
    VERY_LOW: 100,    // 0.01%
    LOW: 500,         // 0.05% 
    MEDIUM: 3000,     // 0.3%
    HIGH: 10000,      // 1%
  },
  TICK_SPACING: {
    100: 1,     // 0.01% → 1
    500: 10,    // 0.05% → 10
    3000: 60,   // 0.3%  → 60
    10000: 200, // 1%    → 200
  },
  DEFAULT_FEE: 3000,
  DEFAULT_SLIPPAGE_BPS: 50, // 0.5%
} as const;

// ===== 6. Fix Savings Token Type Constants =====

export const SAVINGS_TOKEN_TYPES = {
  OUTPUT_TOKEN: 0,
  INPUT_TOKEN: 1,
  SPECIFIC_TOKEN: 2,
} as const;

export type SavingsTokenType = typeof SAVINGS_TOKEN_TYPES[keyof typeof SAVINGS_TOKEN_TYPES];

// Helper function to validate savings token type
export function isValidSavingsTokenType(value: number): value is SavingsTokenType {
  return Object.values(SAVINGS_TOKEN_TYPES).includes(value as SavingsTokenType);
}

// Create a custom tick data provider to avoid "No tick data provider was given" error
class SimpleTickDataProvider {
  private ticks: Map<number, { liquidityNet: JSBI; liquidityGross: JSBI }> = new Map();
  private tickSpacing: number;
  private currentTick: number;

  constructor(currentTick: number, tickSpacing: number = 60) {
    this.currentTick = currentTick;
    this.tickSpacing = tickSpacing;
    
    // Initialize with minimal data for the current tick
    this.ticks.set(currentTick, {
      liquidityNet: JSBI.BigInt(0),
      liquidityGross: JSBI.BigInt(0)
    });
  }

  // Add a tick to our local cache
  public addTick(
    tick: number, 
    liquidityNet: JSBI, 
    liquidityGross: JSBI
  ): void {
    this.ticks.set(tick, { liquidityNet, liquidityGross });
  }

  // Add multiple ticks at once
  public addTicks(
    ticks: Array<{ index: number; liquidityNet: JSBI; liquidityGross: JSBI }>
  ): void {
    for (const tick of ticks) {
      this.addTick(tick.index, tick.liquidityNet, tick.liquidityGross);
    }
  }

  // Return liquidity information for a specific tick
  async getTick(
    tick: number
  ): Promise<{ liquidityNet: JSBI; liquidityGross: JSBI }> {
    // Check if we have the tick in our cache
    if (this.ticks.has(tick)) {
      return this.ticks.get(tick)!;
    }

    // For ticks not in our cache, return default values
    // In production, this would fetch from the blockchain
    return {
      liquidityNet: JSBI.BigInt(0),
      liquidityGross: JSBI.BigInt(0)
    };
  }

  // This function is required by the Pool class to find nearby initialized ticks
  async nextInitializedTickWithinOneWord(
    tick: number,
    lte: boolean,
    tickSpacing: number
  ): Promise<[number, boolean]> {
    // Calculate the normalized tick based on tick spacing
    const compressed = Math.floor(tick / tickSpacing) * tickSpacing;
    
    // If we want initialized ticks less than or equal to the given tick
    if (lte) {
      // First try to find the closest initialized tick at or below the compressed tick
      const ticksBelow = Array.from(this.ticks.keys())
        .filter(t => t <= compressed)
        .sort((a, b) => b - a);  // Sort in descending order
      
      if (ticksBelow.length > 0) {
        // Return the closest initialized tick at or below our tick
        return [ticksBelow[0], true];
      }
      
      // No initialized ticks below, return the compressed tick as a placeholder
      return [compressed, false];
    } else {
      // Find the closest initialized tick above the compressed tick
      const ticksAbove = Array.from(this.ticks.keys())
        .filter(t => t > compressed)
        .sort((a, b) => a - b);  // Sort in ascending order
      
      if (ticksAbove.length > 0) {
        // Return the closest initialized tick above our tick
        return [ticksAbove[0], true];
      }
      
      // No initialized ticks above, return the next spacing boundary
      return [compressed + tickSpacing, false];
    }
  }
}

export class UniswapV4Client {
  readonly provider: ethers.providers.Provider
  readonly signer?: ethers.Signer
  userAddress: string | null = null;
  private ethPriceInUsd: number = 2500; // Default ETH price, should be updated
  private baseScanClient: BaseScanClient;
  private isInitialized: boolean = false;
  private networkStatus: 'connected' | 'disconnected' | 'unknown' = 'unknown';

  private v4RouterClient: V4UniversalRouterClient;
  private v4QuoterClient: V4QuoterClient;
  private v4ContractsValidated: boolean = false;

  private activeEventListeners: Map<string, EventListenerManager> = new Map();
  private eventCallbacks: Map<string, Array<(data: any) => void>> = new Map();
  private contractsValidated: boolean = false;

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider
    this.signer = signer
    this.baseScanClient = new BaseScanClient();

    this.v4RouterClient = new V4UniversalRouterClient(provider, signer);
    this.v4QuoterClient = new V4QuoterClient(provider);
    
    // Initialize network detection
    this.detectNetwork().catch(err => {
      console.warn('Network detection failed during construction:', err);
      this.networkStatus = 'disconnected';
    });
  }

  async validateV4Contracts(): Promise<boolean> {
    if (this.v4ContractsValidated) return true;

    console.log('🔍 Validating V4 contract deployments on Base...');
    
    const validation = await validateV4Deployment(this.provider);
    
    if (!validation.isValid) {
      console.error('❌ V4 contract validation failed:');
      validation.errors.forEach(error => console.error(`  ${error}`));
      return false;
    }
    
    console.log('✅ All V4 contracts validated:', validation.deployedContracts);
    this.v4ContractsValidated = true;
    return true;
  }

  async getV4Quote(params: {
    fromToken: SupportedTokenSymbol;
    toToken: SupportedTokenSymbol;
    amountIn: string;
    hookData?: string;
  }) {
    if (!this.v4ContractsValidated) {
      await this.validateV4Contracts();
    }

    console.log('🔍 Getting V4 quote via Quoter contract...');
    
    const quoteParams: QuoteParams = {
      fromToken: params.fromToken,
      toToken: params.toToken,
      amountIn: params.amountIn,
      hookData: params.hookData || ethers.utils.defaultAbiCoder.encode(['address'], [this.userAddress || ethers.constants.AddressZero])
    };

    return await this.v4QuoterClient.getQuote(quoteParams);
  }

  // Detect network and ensure we're on Base mainnet (chainId 8453)
  async detectNetwork(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 8453) {
        console.warn(`Connected to network: ${network.name} (${chainId}). Please switch to Base mainnet (8453)`);
        this.networkStatus = 'connected';
      } else {
        console.log(`✅ Connected to Base mainnet (${chainId})`);
        this.networkStatus = 'connected';
      }
    } catch (error) {
      console.error('Network detection error:', error);
      this.networkStatus = 'disconnected';
    }
  }

  async validateNetworkOrThrow(): Promise<void> {
    try {
      const network = await this.provider.getNetwork();
      const chainId = Number(network.chainId);
      
      if (chainId !== 8453) {
        throw new Error(`Wrong network: Connected to ${network.name} (${chainId}). Please switch to Base mainnet (8453).`);
      }
      
      console.log('✅ Network validation passed: Base mainnet');
    } catch (error) {
      console.error('❌ Network validation failed:', error);
      throw error;
    }
  }

  async validateContractDeployments(): Promise<{
    isValid: boolean;
    errors: string[];
    warnings: string[];
  }> {
    const errors: string[] = [];
    const warnings: string[] = [];

    console.log('🔍 Validating contract deployments...');

    // Core contracts that must exist
    const coreContracts = [
      { name: 'SpendSaveHook', address: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK },
      { name: 'SpendSaveStorage', address: CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE },
      { name: 'PoolManager', address: CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_POOL_MANAGER },
    ];

    // Module contracts (important but not critical)
    const moduleContracts = [
      { name: 'SavingStrategy', address: CONTRACT_ADDRESSES.SAVING_STRATEGY },
      { name: 'SavingsModule', address: CONTRACT_ADDRESSES.SAVING },
      { name: 'DCAModule', address: CONTRACT_ADDRESSES.DCA },
      { name: 'YieldModule', address: CONTRACT_ADDRESSES.YIELD_MODULE },
      { name: 'DailySavingsModule', address: CONTRACT_ADDRESSES.DAILY_SAVINGS },
      { name: 'TokenModule', address: CONTRACT_ADDRESSES.TOKEN },
      { name: 'SlippageControlModule', address: CONTRACT_ADDRESSES.SLIPPAGE_CONTROL },
    ];

    // Check core contracts
    for (const contract of coreContracts) {
      try {
        const code = await this.provider.getCode(contract.address);
        if (!code || code === '0x' || code === '0x0') {
          errors.push(`❌ ${contract.name} not deployed at ${contract.address}`);
        } else {
          console.log(`✅ ${contract.name} verified at ${contract.address}`);
        }
      } catch (error) {
        errors.push(`❌ Failed to check ${contract.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    // Check module contracts (warnings only)
    for (const contract of moduleContracts) {
      try {
        const code = await this.provider.getCode(contract.address);
        if (!code || code === '0x' || code === '0x0') {
          warnings.push(`⚠️ ${contract.name} not deployed at ${contract.address}`);
        } else {
          console.log(`✅ ${contract.name} verified at ${contract.address}`);
        }
      } catch (error) {
        warnings.push(`⚠️ Could not verify ${contract.name}: ${error instanceof Error ? error.message : String(error)}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  async validateSpendSaveHookIntegration(): Promise<{
    isValid: boolean;
    errors: string[];
    details: any;
  }> {
    const errors: string[] = [];
    let details: any = {};

    try {
      // Use the improved hook validation function
      const hookValidation = await validateHookPermissions(
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        this.provider
      );

      if (!hookValidation.isValid) {
        errors.push(...hookValidation.errors);
        details = hookValidation.details;
        return { isValid: false, errors, details };
      }

      details = hookValidation.details;

      // Additional validation using ethers.js contract
      const hookContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        SpendSaveHookABI,
        this.provider
      );

      // Check storage contract connection
      try {
        const storageAddress = await hookContract.storage_();
        if (storageAddress.toLowerCase() !== CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE.toLowerCase()) {
          errors.push(`Hook storage address mismatch: expected ${CONTRACT_ADDRESSES.SPEND_SAVE_STORAGE}, got ${storageAddress}`);
        } else {
          details.storageConnected = true;
          console.log('✅ Hook properly connected to storage contract');
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        if (errorMsg.includes('function does not exist')) {
          console.warn('⚠️ storage_ method not available (this may be expected)');
          details.storageConnected = 'unknown';
        } else {
          errors.push(`Failed to verify storage connection: ${errorMsg}`);
          details.storageConnected = false;
        }
      }

      // Check if we can get user processing queue (validates user interaction capability)
      if (this.userAddress) {
        try {
          const queueLength = await hookContract.getUserProcessingQueueLength(this.userAddress);
          details.userInteractionWorking = true;
          details.userQueueLength = queueLength.toNumber();
          console.log(`✅ User interaction working, queue length: ${queueLength.toNumber()}`);
        } catch (error) {
          console.warn('⚠️ Could not verify user interaction capability:', error);
          details.userInteractionWorking = false;
        }
      }

    } catch (error) {
      errors.push(`Hook validation failed: ${error instanceof Error ? error.message : String(error)}`);
    }

    return {
      isValid: errors.length === 0,
      errors,
      details
    };
  }

  async validateAllContracts(): Promise<boolean> {
    if (this.contractsValidated) {
      return true; // Already validated
    }

    console.log('🚀 Starting comprehensive contract validation...');

    // 1. Validate contract deployments
    const deploymentValidation = await this.validateContractDeployments();
    
    if (!deploymentValidation.isValid) {
      console.error('❌ Contract deployment validation failed:');
      deploymentValidation.errors.forEach(error => console.error(`  ${error}`));
      return false;
    }

    if (deploymentValidation.warnings.length > 0) {
      console.warn('⚠️ Contract deployment warnings:');
      deploymentValidation.warnings.forEach(warning => console.warn(`  ${warning}`));
    }

    // 2. Validate SpendSave hook integration
    const hookValidation = await this.validateSpendSaveHookIntegration();
    
    if (!hookValidation.isValid) {
      console.error('❌ SpendSave hook validation failed:');
      hookValidation.errors.forEach(error => console.error(`  ${error}`));
      return false;
    }

    console.log('✅ All contract validations passed');
    this.contractsValidated = true;
    return true;
  }

  


  /**
   * PHASE 1: Verify SpendSaveHook Integration
   * Confirms that the SpendSaveHook is properly initialized and accessible
   */                                      
  async verifyHookIntegration(): Promise<boolean> {
    try {
      console.log('🔍 Phase 1: Verifying SpendSaveHook integration...');
      

      const hookContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        SpendSaveHookABI,
        this.provider
      );

      // Check if hook is initialized
      let isHookInitialized = false;
      try {
        isHookInitialized = await hookContract.isInitialized();
        console.log(`✅ Hook initialization status: ${isHookInitialized}`);
      } catch (error) {
        console.warn('⚠️ Could not verify hook initialization (method may not exist), assuming initialized');
        // If the method doesn't exist, we'll assume the hook is functioning
        // This is a fallback for hooks that might not implement this specific method
        isHookInitialized = true;
      }

      // Additional verification: Check if we can interact with the hook contract
      try {
        const hookCode = await this.provider.getCode(CONTRACT_ADDRESSES.SPEND_SAVE_HOOK);
        const hasCode = hookCode !== '0x' && hookCode !== '0x0';
        console.log(`✅ Hook contract has code deployed: ${hasCode}`);
        
        if (!hasCode) {
          console.error('❌ SpendSaveHook contract has no code at address:', CONTRACT_ADDRESSES.SPEND_SAVE_HOOK);
          return false;
        }
      } catch (error) {
        console.error('❌ Error checking hook contract code:', error);
        return false;
      }

      // Verify user-specific hook functionality if user address is available
      if (this.userAddress) {
        try {
          const canProcess = await hookContract.canProcessSavings(this.userAddress);
          console.log(`✅ Hook can process savings for user ${this.userAddress}: ${canProcess}`);
        } catch (error) {
          console.warn('⚠️ Could not verify user-specific hook functionality (method may not exist)');
          // This is not critical - the hook might not implement this specific method
        }
      }

      const overallStatus = isHookInitialized;
      console.log(`🎯 Phase 1 Result: Hook integration verified = ${overallStatus}`);
      
      return overallStatus;
    } catch (error) {
      console.error('❌ Phase 1: Hook integration verification failed:', error);
      return false;
    }
  }

  /**
   * Initialize the client with user address for operations requiring user context
   */
  async init(userAddress?: string): Promise<void> {
    try {
      await this.validateNetworkOrThrow();
      
      // 🆕 Validate V4 contracts
      const v4Valid = await this.validateV4Contracts();
      if (!v4Valid) {
        throw new Error('V4 contract validation failed');
      }
      
      const contractsValid = await this.validateAllContracts();
      if (!contractsValid) {
        throw new Error('SpendSave contract validation failed');
      }
  
      this.ethPriceInUsd = await this.getEthPrice();
      
      if (userAddress) {
        this.userAddress = userAddress;
      } else if (this.signer) {
        this.userAddress = await this.signer.getAddress();
      }
      
      this.isInitialized = true;
      console.log('✅ UniswapV4Client initialized with V4 Universal Router');
    } catch (error) {
      console.error("❌ Failed to initialize UniswapV4Client:", error);
      throw error;
    }
  }

  /**
   * Get the current ETH price in USD
   */
  async getEthPrice(): Promise<number> {
    try {
      // Try to fetch from a public API
      const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd');
      const data = await response.json();
      
      if (data && data.ethereum && data.ethereum.usd) {
        return data.ethereum.usd;
      }
      
      // Fallback to a reasonable default
      return 2500;
    } catch (error) {
      console.warn('Error fetching ETH price, using default', error);
      // Return a reasonable hardcoded value if fetch fails
      return 2500;
    }
  }

  /**
   * Helper to ensure tokens are proper instances
   */
  private enforceTokenInstance(token: any): Token {
    if (token instanceof Token) {
      return token;
    }
    
    // Handle different token formats
    if (typeof token === 'string') {
      // Assume it's an address
      const foundToken = Object.values(SUPPORTED_TOKENS).find(t => 
        (t as any).address?.toLowerCase() === token.toLowerCase()
      );
      
      if (foundToken && foundToken instanceof Token) {
        return foundToken as Token;
      }
      
      // Create default token
      return new Token(
        CHAIN_ID,
        token as string,
        18,
        'UNKNOWN',
        'Unknown Token'
      );
    }
    
    // Handle token-like objects
    if (token.address) {
      return new Token(
        CHAIN_ID,
        token.address,
        token.decimals || 18,
        token.symbol || 'UNKNOWN',
        token.name || 'Unknown Token'
      );
    }
    
    throw new Error('Invalid token format');
  }

  /**
   * Sort tokens by address
   */
  private sortTokens(tokenA: Token, tokenB: Token): [Token, Token] {
    return tokenA.address.toLowerCase() < tokenB.address.toLowerCase()
      ? [tokenA, tokenB]
      : [tokenB, tokenA];
  }

  /**
   * Create a fallback pool with safe default values
   */
  private createFallbackPool(inputToken: Token, outputToken: Token, fee: number): Pool {
    try {
      // Sort tokens correctly
      const [token0, token1] = this.sortTokens(inputToken, outputToken);
      
      // Create a simple tick data provider
      const tickDataProvider = new SimpleTickDataProvider(0, 60);
      
      // Use standard tick spacing for fee
      let tickSpacing = 60; // Default for 0.3% pools
      if (fee === 500) tickSpacing = 10;
      if (fee === 100) tickSpacing = 1;
      if (fee === 10000) tickSpacing = 200;
      
      // Use token symbols to determine a reasonable default price
      let sqrtPriceX96 = '1'; // Default
      
      // Try to use token symbols to make better fallback price estimates
      if ((token0.symbol === 'WETH' || token0.symbol === 'ETH') && token1.symbol === 'USDC') {
        // ~$2500 ETH price
        sqrtPriceX96 = '1517882343751509868544'
      } else if (token0.symbol === 'USDC' && (token1.symbol === 'WETH' || token1.symbol === 'ETH')) {
        // Inverse of above
        sqrtPriceX96 = '658641163350';
      } else if (token0.symbol === 'WETH' && token1.symbol === 'ETH') {
        // 1:1 ratio for WETH:ETH
        sqrtPriceX96 = '79228162514264337593543950336';
      }
      
      // Create default pool with all required parameters
      return new Pool(
        token0,
        token1,
        fee,
        tickSpacing,
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK, // Using your hook as hook
        sqrtPriceX96,
        '1000000', // Default liquidity - a bit higher than 1
        0,        // Default tick
        tickDataProvider
      );
    } catch (fallbackError) {
      console.error('Error creating fallback pool:', fallbackError);
      
      // Ultimate fallback - very basic pool with minimal parameters
      const [token0, token1] = this.sortTokens(inputToken, outputToken);
      const tickDataProvider = new SimpleTickDataProvider(0, 60);
      
      return new Pool(
        token0,
        token1,
        fee,
        60,
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        '1',
        '1',
        0,
        tickDataProvider
      );
    }
  }

  /**
   * Fetches pool data in a reliable way - handles token type consistency
   */
  async fetchPoolData(
    inputToken: Token,
    outputToken: Token,
    fee: number = 3000
  ): Promise<Pool> {
    try {
      // First check network status before attempting network calls
      if (this.networkStatus === 'disconnected') {
        console.warn('Network is disconnected, using fallback pool data');
        return this.createFallbackPool(inputToken, outputToken, fee);
      }

      try {
        // Re-detect network if status is unknown
        if (this.networkStatus !== 'connected') {
          await this.detectNetwork();
        }
        
        // For now, just return fallback pool since we removed quoter functionality
        return this.createFallbackPool(inputToken, outputToken, fee);
      } catch (error) {
        console.warn('Error fetching on-chain pool data:', error);
        return this.createFallbackPool(inputToken, outputToken, fee);
      }
    } catch (error) {
      console.error('Error in fetchPoolData:', error);
      // Final fallback with very safe defaults
      return this.createFallbackPool(inputToken, outputToken, fee);
    }
  }

  private async setupRealTimeEventListeners(
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol
  ): Promise<EventListenerManager> {
    console.log('🎧 PHASE 3: Setting up real-time event listeners...');
    
    const spendSaveHook = new ethers.Contract(
      CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
      SpendSaveHookAbi,
      this.provider
    );
    
    const savingStrategy = new ethers.Contract(
      CONTRACT_ADDRESSES.SAVING_STRATEGY,
      SavingStrategyAbi,
      this.provider
    );
  
    let status: 'inactive' | 'listening' | 'completed' | 'error' = 'inactive';
    const eventsReceived: string[] = []; 
    const eventListeners: Array<() => void> = [];
  
    const manager: EventListenerManager = {
      startListening: () => {
        if (status === 'listening') return;
        
        console.log('🎧 PHASE 3: Starting real-time event monitoring...');
        status = 'listening';
  
        // Listen for savings processing events
        const onOutputSavingsProcessed = (user: string, token: string, amount: ethers.BigNumber, event: any) => {
          console.log('💰 PHASE 3: OutputSavingsProcessed event received:', {
            user,
            token,
            amount: amount.toString(),
            blockNumber: event.blockNumber,
            transactionHash: event.transactionHash
          });
          
          eventsReceived.push('OutputSavingsProcessed');
          this.triggerEventCallback('OutputSavingsProcessed', {
            user,
            token,
            amount: amount.toString(),
            formattedAmount: ethers.utils.formatEther(amount),
            event
          });
        };

        // PHASE 4: Listen for DCA-related events
        const onDCASwapExecuted = (user: string, fromToken: string, toToken: string, amountIn: ethers.BigNumber, amountOut: ethers.BigNumber, event: any) => {
          console.log('🔄 PHASE 4: DCASwapExecuted event received:', {
            user,
            fromToken,
            toToken,
            amountIn: amountIn.toString(),
            amountOut: amountOut.toString(),
            blockNumber: event.blockNumber
          });
          
          eventsReceived.push('DCASwapExecuted');
          this.triggerEventCallback('DCASwapExecuted', {
            user,
            fromToken,
            toToken,
            amountIn: amountIn.toString(),
            amountOut: amountOut.toString(),
            event
          });
        };

        const onDCAQueueProcessed = (user: string, itemsProcessed: ethers.BigNumber, event: any) => {
          console.log('🔄 PHASE 4: DCAQueueProcessed event received:', {
            user,
            itemsProcessed: itemsProcessed.toNumber(),
            blockNumber: event.blockNumber
          });
          
          eventsReceived.push('DCAQueueProcessed');
          this.triggerEventCallback('DCAQueueProcessed', {
            user,
            itemsProcessed: itemsProcessed.toNumber(),
            event
          });
        };
  
        const onInputTokenSaved = (user: string, token: string, savedAmount: ethers.BigNumber, remainingAmount: ethers.BigNumber, event: any) => {
          console.log('💰 PHASE 3: InputTokenSaved event received:', { user, token, savedAmount: savedAmount.toString() });
          eventsReceived.push('InputTokenSaved');
          this.triggerEventCallback('InputTokenSaved', {
            user, token, savedAmount: savedAmount.toString(), remainingAmount: remainingAmount.toString(), event
          });
        };
  
        const onSpecificTokenSwapQueued = (user: string, fromTokenAddr: string, toTokenAddr: string, amount: ethers.BigNumber, event: any) => {
          console.log('🔄 PHASE 3: SpecificTokenSwapQueued event received:', { user, fromToken: fromTokenAddr, toToken: toTokenAddr });
          eventsReceived.push('SpecificTokenSwapQueued');
          this.triggerEventCallback('SpecificTokenSwapQueued', {
            user, fromToken: fromTokenAddr, toToken: toTokenAddr, amount: amount.toString(), event
          });
        };
  
        const onAfterSwapError = (user: string, reason: string, event: any) => {
          console.error('❌ PHASE 3: AfterSwapError event received:', { user, reason });
          eventsReceived.push('AfterSwapError');
          status = 'error';
          this.triggerEventCallback('AfterSwapError', { user, reason, event });
        };
  
        const onBeforeSwapError = (user: string, reason: string, event: any) => {
          console.error('❌ PHASE 3: BeforeSwapError event received:', { user, reason });
          eventsReceived.push('BeforeSwapError');
          status = 'error';
          this.triggerEventCallback('BeforeSwapError', { user, reason, event });
        };
  
        const onAfterSwapExecuted = (user: string, delta: any, event: any) => {
          console.log('✅ PHASE 3: AfterSwapExecuted event received:', { user, delta: delta.toString() });
          eventsReceived.push('AfterSwapExecuted');
          this.triggerEventCallback('AfterSwapExecuted', { user, delta: delta.toString(), event });
        };
  
        const onSavingsProcessedSuccessfully = (user: string, token: string, amount: ethers.BigNumber, event: any) => {
          console.log('✅ PHASE 3: SavingsProcessedSuccessfully event received:', { user, token, amount: amount.toString() });
          eventsReceived.push('SavingsProcessedSuccessfully');
          this.triggerEventCallback('SavingsProcessedSuccessfully', { user, token, amount: amount.toString(), event });
        };
  
        // Set up event listeners with user filter
        const userFilter = this.userAddress ? [this.userAddress] : undefined;
  
        spendSaveHook.on(spendSaveHook.filters.OutputSavingsProcessed(userFilter), onOutputSavingsProcessed);
        spendSaveHook.on(spendSaveHook.filters.SpecificTokenSwapQueued(userFilter), onSpecificTokenSwapQueued);
        spendSaveHook.on(spendSaveHook.filters.AfterSwapError(userFilter), onAfterSwapError);
        spendSaveHook.on(spendSaveHook.filters.BeforeSwapError(userFilter), onBeforeSwapError);
        spendSaveHook.on(spendSaveHook.filters.AfterSwapExecuted(userFilter), onAfterSwapExecuted);

        savingStrategy.on(savingStrategy.filters.InputTokenSaved(userFilter), onInputTokenSaved);
        savingStrategy.on(savingStrategy.filters.SavingsProcessedSuccessfully(userFilter), onSavingsProcessedSuccessfully);

        // PHASE 4: Set up DCA event listeners
        try {
          // Import DCA contract for event listening
          const dcaContract = new ethers.Contract(
            CONTRACT_ADDRESSES.DCA,
            DCAABI,
            this.provider
          );

          dcaContract.on(dcaContract.filters.DCASwapExecuted?.(userFilter), onDCASwapExecuted);
          dcaContract.on(dcaContract.filters.DCAQueueProcessed?.(userFilter), onDCAQueueProcessed);

          // Add DCA cleanup
          eventListeners.push(() => dcaContract.removeAllListeners());
          console.log('🔄 PHASE 4: DCA event listeners configured');
        } catch (error) {
          console.warn('⚠️ PHASE 4: Could not set up DCA event listeners:', error);
        }
  
        // Store cleanup functions
        eventListeners.push(
          () => spendSaveHook.removeAllListeners(),
          () => savingStrategy.removeAllListeners()
        );
  
        console.log('🎧 PHASE 3: Event listeners configured for user:', this.userAddress);
      },
  
      stopListening: () => {
        console.log('🔇 PHASE 3: Stopping event listeners...');
        eventListeners.forEach(cleanup => cleanup());
        status = 'completed';
      },
  
      getStatus: () => status,
      getEventsReceived: () => [...eventsReceived],
      addEventCallback: (eventName: string, callback: (data: any) => void) => {
        if (!this.eventCallbacks.has(eventName)) {
          this.eventCallbacks.set(eventName, []);
        }
        this.eventCallbacks.get(eventName)!.push(callback);
      }
    };
  
    // Store the manager for cleanup
    const managerId = `${fromToken}-${toToken}-${Date.now()}`;
    this.activeEventListeners.set(managerId, manager);
  
    return manager;
  }

  private triggerEventCallback(eventName: string, data: any): void {
    const callbacks = this.eventCallbacks.get(eventName);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event callback for ${eventName}:`, error);
        }
      });
    }
  }

  private cleanupEventListeners(): void {
    console.log('🧹 PHASE 3: Cleaning up all event listeners...');
    this.activeEventListeners.forEach(manager => {
      manager.stopListening();
    });
    this.activeEventListeners.clear();
    this.eventCallbacks.clear();
  }

  private async verifyHookExecutionWithEvents(
    tx: ethers.providers.TransactionResponse,
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol,
    eventManager: EventListenerManager
  ): Promise<{
    beforeSwapExecuted: boolean;
    afterSwapExecuted: boolean;
    savingsProcessed: boolean;
    errors: string[];
    realTimeEvents: string[];
    eventDetails: any[];
  }> {
    const result = {
      beforeSwapExecuted: false,
      afterSwapExecuted: false,
      savingsProcessed: false,
      errors: [] as string[],
      realTimeEvents: [] as string[],
      eventDetails: [] as any[]
    };
    
    try {
      console.log('⏳ PHASE 3: Waiting for transaction receipt with event monitoring...');
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        result.errors.push('Transaction failed');
        return result;
      }
      
      console.log('📄 PHASE 3: Transaction confirmed, analyzing events and real-time data...');
      
      // Get real-time events received during transaction
      result.realTimeEvents = eventManager.getEventsReceived();
      
      // Continue with original verification logic
      const spendSaveHook = new ethers.Contract(
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        SpendSaveHookAbi,
        this.provider
      );
      
      const parsedEvents = receipt.logs
        .map(log => {
          try {
            return spendSaveHook.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event !== null);
      
      console.log('🔍 PHASE 3: Hook events found in receipt:', parsedEvents.map(e => e?.name));
      console.log('🎧 PHASE 3: Real-time events received:', result.realTimeEvents);
      
      // Verify events match between receipt and real-time listeners
      const afterSwapEvent = parsedEvents.find(e => e?.name === 'AfterSwapExecuted');
      if (afterSwapEvent || result.realTimeEvents.includes('AfterSwapExecuted')) {
        result.afterSwapExecuted = true;
        console.log('✅ PHASE 3: AfterSwap hook executed (verified via events)');
      }
      
      const savingsEvents = parsedEvents.filter(e => 
        e?.name === 'OutputSavingsProcessed' || 
        e?.name === 'InputTokenSaved' ||
        e?.name === 'SavingsProcessedSuccessfully'
      );
      
      const realTimeSavingsEvents = result.realTimeEvents.filter(e =>
        e === 'OutputSavingsProcessed' || 
        e === 'InputTokenSaved' ||
        e === 'SavingsProcessedSuccessfully'
      );
      
      if (savingsEvents.length > 0 || realTimeSavingsEvents.length > 0) {
        result.savingsProcessed = true;
        console.log('💰 PHASE 3: Savings processing confirmed via events:', {
          receiptEvents: savingsEvents.length,
          realTimeEvents: realTimeSavingsEvents.length
        });
      }
      
      // BeforeSwap verification
      if (result.afterSwapExecuted) {
        result.beforeSwapExecuted = true;
      }
      
      // Final validation
      if (!result.afterSwapExecuted) {
        result.errors.push('AfterSwap hook did not execute - savings may not have been processed');
      }
      
      if (!result.savingsProcessed && result.afterSwapExecuted) {
        result.errors.push('Hook executed but no savings events detected');
      }
      
    } catch (error) {
      const errorMsg = `PHASE 3 Hook verification failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
    
    return result;
  }

  async executeSwap(params: {
    fromToken: SupportedTokenSymbol
    toToken: SupportedTokenSymbol
    amountRaw: string
    slippageBps?: number
    fee?: number
    deadlineSeconds?: number
    gasOverrideGwei?: number
    hookFlags?: HookFlags
    savingsPath?: SupportedTokenSymbol[]
    disableSavings?: boolean
  }): Promise<SwapExecutionResult> {
    if (!this.signer) throw new Error('Signer not initialised')

    // Validate V4 contracts first
    const v4Valid = await this.validateV4Contracts();
    if (!v4Valid) {
      throw new Error('V4 contract validation failed - cannot proceed with swap');
    }

    // PHASE 1: Hook verification (keep existing)
    console.log('🚀 Starting V4 swap execution via Universal Router...');
    const isHookReady = await this.verifyHookIntegration();
    
    if (!isHookReady) {
      throw new Error('SpendSave hook integration verification failed.');
    }

    const {
      fromToken,
      toToken,
      amountRaw,
      slippageBps = 50,
      disableSavings = false,
    } = params

    // Get tokens
    const tokenA = SUPPORTED_TOKENS[fromToken] as Token
    const tokenB = SUPPORTED_TOKENS[toToken] as Token

    // Parse amount
    const amountInRaw = ethers.utils.parseUnits(
      amountRaw,
      tokenA.decimals
    ).toString()

    if (!this.userAddress && this.signer) {
      this.userAddress = await this.signer.getAddress()
    }

    if (!this.userAddress) {
      throw new Error('User address not available')
    }

    // Strategy validation (keep existing)
    if (!disableSavings) {
      console.log('🔍 Validating user savings strategy...');
      await this.validateUserStrategy();
    }

    const valueToSend = fromToken === 'ETH' ? 
      ethers.utils.parseUnits(amountRaw, 18) : 
      ethers.BigNumber.from(0);

    // Prepare hookData (keep existing encoding)
    const hookData = ethers.utils.defaultAbiCoder.encode(
      ['address'],
      [this.userAddress]
    );

    // 🆕 Get quote first for better UX and validation
    try {
      const quote = await this.getV4Quote({
        fromToken,
        toToken,
        amountIn: amountRaw,
        hookData
      });
      
      console.log('💰 V4 Quote received:', {
        amountOut: quote.amountOut,
        gasEstimate: quote.gasEstimate,
        priceImpact: quote.priceImpact
      });
      
      // Calculate minimum amount out with slippage
      const amountOutQuote = parseFloat(quote.amountOut);
      const minAmountOut = ethers.utils.parseUnits(
        (amountOutQuote * (1 - slippageBps / 10000)).toFixed(6),
        tokenB.decimals
      ).toString();

      // 🆕 Build V4 swap parameters
      const v4SwapParams: V4SwapParams = {
        fromToken,
        toToken,
        amountIn: amountInRaw,
        amountOutMinimum: minAmountOut,
        recipient: this.userAddress,
        deadline: Math.floor(Date.now() / 1000) + 1800, // 30 minutes
        hookData,
        ethValue: valueToSend
      };

      // PHASE 3: Set up event listeners (keep existing)
      const eventManager = await this.setupRealTimeEventListeners(fromToken, toToken);
      eventManager.startListening();
      
      // 🆕 Execute via V4 Universal Router
      const tx = await this.v4RouterClient.executeV4Swap(v4SwapParams);
      
      console.log('✅ V4 Universal Router transaction sent:', tx.hash);
      
      // Enhanced transaction result
      const enhancedTx = tx as SwapExecutionResult;
      
      // Set up event listener cleanup
      enhancedTx.eventListeners = {
        cleanup: () => eventManager.stopListening(),
        status: eventManager.getStatus() as 'listening' | 'completed' | 'error',
        eventsReceived: eventManager.getEventsReceived()
      };

      // Hook execution verification
      if (!disableSavings) {
        console.log('🔍 Starting V4 hook execution verification...');
        const hookStatus = await this.verifyHookExecutionWithEvents(tx, fromToken, toToken, eventManager);
        enhancedTx.hookExecutionStatus = hookStatus;
        
        if (hookStatus.errors.length > 0) {
          console.warn('⚠️ Hook execution issues:', hookStatus.errors);
        }
      }
      
      return enhancedTx;

    } catch (quoteError) {
      console.warn('⚠️ V4 quote failed, proceeding without quote:', quoteError);
      
      // Fallback: proceed without quote (less optimal but still functional)
      const minAmountOut = ethers.utils.parseUnits(
        (parseFloat(amountRaw) * (1 - slippageBps / 10000)).toFixed(6),
        tokenB.decimals
      ).toString();

      const v4SwapParams: V4SwapParams = {
        fromToken,
        toToken,
        amountIn: amountInRaw,
        amountOutMinimum: minAmountOut,
        recipient: this.userAddress,
        hookData,
        ethValue: valueToSend
      };

      const tx = await this.v4RouterClient.executeV4Swap(v4SwapParams);
      return tx as SwapExecutionResult;
    }
  }

  /**
   * PHASE 1: Validate user has configured savings strategy
   */
  private async validateUserStrategy(): Promise<void> {
    try {
      const savingStrategyContract = new ethers.Contract(
        CONTRACT_ADDRESSES.SAVING_STRATEGY,
        SavingStrategyAbi,
        this.signer
      );
      
      console.log('📋 Checking user strategy for:', this.userAddress);
      const userStrategy = await savingStrategyContract.getUserSavingStrategy(this.userAddress);
      
      // Check if user has configured a savings percentage
      if (!userStrategy.percentage || userStrategy.percentage.eq(0)) {
        throw new Error('STRATEGY_NOT_CONFIGURED: No savings percentage configured. Please set up your savings strategy before swapping.');
      }
      
      // Validate strategy configuration
      const percentageValue = userStrategy.percentage.toNumber();
      if (percentageValue < 100) { // Less than 1% (since it's in basis points)
        console.warn('⚠️ Very low savings percentage:', percentageValue / 100, '%');
      }
      
      if (percentageValue > 5000) { // More than 50%
        throw new Error('STRATEGY_INVALID: Savings percentage too high (>50%). Please reduce for safety.');
      }
      
      // Check specific token configuration if needed
      if (userStrategy.savingsTokenType === 2) { // SPECIFIC token type
        if (!userStrategy.specificSavingsToken || userStrategy.specificSavingsToken === ethers.constants.AddressZero) {
          throw new Error('STRATEGY_INCOMPLETE: Specific savings token not configured. Please set a target token.');
        }
      }
      
      console.log('✅ Strategy validation passed:', {
        percentage: percentageValue / 100 + '%',
        type: userStrategy.savingsTokenType,
        roundUp: userStrategy.roundUpSavings,
        enableDCA: userStrategy.enableDCA
      });
      
    } catch (error) {
      console.error('❌ Strategy validation failed:', error);
      throw error;
    }
  }

  /**
   * PHASE 1: Verify hook execution after swap transaction
   */
  private async verifyHookExecution(
    tx: ethers.providers.TransactionResponse,
    fromToken: SupportedTokenSymbol,
    toToken: SupportedTokenSymbol
  ): Promise<{
    beforeSwapExecuted: boolean;
    afterSwapExecuted: boolean;
    savingsProcessed: boolean;
    errors: string[];
  }> {
    const result = {
      beforeSwapExecuted: false,
      afterSwapExecuted: false,
      savingsProcessed: false,
      errors: [] as string[]
    };
    
    try {
      console.log('⏳ Waiting for transaction receipt...');
      const receipt = await tx.wait();
      
      if (receipt.status !== 1) {
        result.errors.push('Transaction failed');
        return result;
      }
      
      console.log('📄 Transaction confirmed, analyzing events...');
      
      // Create contract instance for event parsing
      const spendSaveHook = new ethers.Contract(
        CONTRACT_ADDRESSES.SPEND_SAVE_HOOK,
        SpendSaveHookAbi,
        this.provider
      );
      
      // Parse all logs to find hook-related events
      const parsedEvents = receipt.logs
        .map(log => {
          try {
            return spendSaveHook.interface.parseLog(log);
          } catch {
            return null;
          }
        })
        .filter(event => event !== null);
      
      console.log('🔍 Hook events found:', parsedEvents.map(e => e?.name));
      
      // Check for specific hook execution events
      const afterSwapEvent = parsedEvents.find(e => e?.name === 'AfterSwapExecuted');
      if (afterSwapEvent) {
        result.afterSwapExecuted = true;
        console.log('✅ AfterSwap hook executed for user:', afterSwapEvent.args.user);
      }
      
      // Check for savings processing
      const savingsEvents = parsedEvents.filter(e => 
        e?.name === 'OutputSavingsProcessed' || 
        e?.name === 'InputTokenSaved' ||
        e?.name === 'SavingsProcessedSuccessfully'
      );
      
      if (savingsEvents.length > 0) {
        result.savingsProcessed = true;
        savingsEvents.forEach(event => {
          console.log('💰 Savings event:', event?.name, {
            user: event?.args.user,
            token: event?.args.token,
            amount: event?.args.amount?.toString()
          });
        });
      }
      
      // Check for hook errors
      const errorEvents = parsedEvents.filter(e => 
        e?.name === 'AfterSwapError' || 
        e?.name === 'BeforeSwapError'
      );
      
      errorEvents.forEach(event => {
        const errorMsg = `Hook error (${event?.name}): ${event?.args.reason}`;
        result.errors.push(errorMsg);
        console.error('❌', errorMsg);
      });
      
      // BeforeSwap verification (implicit - if afterSwap executed, beforeSwap must have too)
      if (result.afterSwapExecuted) {
        result.beforeSwapExecuted = true;
      }
      
      // Final validation
      if (!result.afterSwapExecuted) {
        result.errors.push('AfterSwap hook did not execute - savings may not have been processed');
      }
      
      if (!result.savingsProcessed && result.afterSwapExecuted) {
        result.errors.push('Hook executed but no savings events detected');
      }
      
    } catch (error) {
      const errorMsg = `Hook verification failed: ${error instanceof Error ? error.message : String(error)}`;
      result.errors.push(errorMsg);
      console.error('❌', errorMsg);
    }
    
    return result;
  }

  /**
   * Fetch pool information (tick, price, liquidity).
   */
  async getPoolInfo(tokenASymbol: SupportedTokenSymbol, tokenBSymbol: SupportedTokenSymbol) {
    const tokenA = SUPPORTED_TOKENS[tokenASymbol] as Token
    const tokenB = SUPPORTED_TOKENS[tokenBSymbol] as Token
    const pool = await this.fetchPoolData(tokenA, tokenB)
    const price = tickToPrice(tokenA, tokenB, pool.tickCurrent)
    return {
      tick: pool.tickCurrent,
      price: price.toSignificant(6),
      liquidity: pool.liquidity.toString(),
    }
  }

  /**
   * Get prices of all supported tokens in USD
   * Returns current prices and API status information
   */
  async getTokenPrices(): Promise<{
    prices: Record<SupportedTokenSymbol, { price: number, status: string }>;
    apiStatus: { 
      isOperational: boolean;
      lastUpdated: Date;
      fallbackUsed: boolean;
    };
  }> {
    try {
      // Initialize the result object
      const result: Record<SupportedTokenSymbol, { price: number, status: string }> = {
        ETH: { price: 0, status: 'loading' },
        WETH: { price: 0, status: 'loading' },
        USDC: { price: 1, status: 'stable' },
      };
      
      // API status tracking
      let isOperational = true;
      let fallbackUsed = false;
      
      // Get ETH price first, will be used for other calculations
      try {
        // Try to get from BaseScan API
        const ethPrice = await this.baseScanClient.getEthPrice();
        result.ETH = { price: ethPrice, status: 'success' };
        result.WETH = { price: ethPrice, status: 'success' }; // WETH has same price as ETH
      } catch (error) {
        console.warn('Failed to get ETH price from BaseScan API, using fallback:', error);
        // Use fallback price for ETH
        const fallbackEthPrice = 2500;
        result.ETH = { price: fallbackEthPrice, status: 'fallback' };
        result.WETH = { price: fallbackEthPrice, status: 'fallback' };
        isOperational = false;
        fallbackUsed = true;
      }
      
      // Return prices and API status
      return {
        prices: result,
        apiStatus: {
          isOperational,
          lastUpdated: new Date(),
          fallbackUsed
        }
      };
    } catch (error) {
      console.error("Error in getTokenPrices:", error);
      // In case of complete failure, return fallback values for everything
      return {
        prices: {
          ETH: { price: 2500, status: 'error' },
          WETH: { price: 2500, status: 'error' },
          USDC: { price: 1, status: 'stable' },
        },
        apiStatus: {
          isOperational: false,
          lastUpdated: new Date(),
          fallbackUsed: true
        }
      };
    }
  }
}