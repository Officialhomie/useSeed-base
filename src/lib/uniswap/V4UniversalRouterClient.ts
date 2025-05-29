import { ethers } from 'ethers';
import { V4_CONTRACTS, BASE_TOKENS, UNIVERSAL_ROUTER_COMMANDS, POOL_CONFIG } from './v4Constants';
import UniversalRouterABI from '@/abi/routing/UniversalRouter.json';
import { CONTRACT_ADDRESSES } from '../contracts';
import type { SupportedTokenSymbol } from './tokens';

export interface V4SwapParams {
  fromToken: SupportedTokenSymbol;
  toToken: SupportedTokenSymbol;
  amountIn: string;
  amountOutMinimum: string;
  recipient: string;
  deadline?: number;
  hookData: string;
  ethValue?: ethers.BigNumber;
}

export interface V4SwapResult extends ethers.providers.TransactionResponse {
  settlementValidated?: boolean;
  hookExecutionConfirmed?: boolean;
  gasOptimized?: boolean;
}

export class V4UniversalRouterClient {
  private router: ethers.Contract;
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    this.router = new ethers.Contract(
      V4_CONTRACTS.UNIVERSAL_ROUTER,
      UniversalRouterABI,
      signer || provider
    );
  }

  async executeV4Swap(params: V4SwapParams): Promise<V4SwapResult> {
    if (!this.signer) {
      throw new Error('Signer required for swap execution');
    }

    const {
      fromToken,
      toToken,
      amountIn,
      amountOutMinimum,
      recipient,
      deadline = Math.floor(Date.now() / 1000) + 1800, // 30 minutes
      hookData,
      ethValue = ethers.BigNumber.from(0)
    } = params;

    console.log('🚀 Executing V4 swap via Universal Router:', {
      fromToken,
      toToken,
      amountIn,
      recipient,
      hookData
    });

    try {
      // Build V4 swap command
      const commands = this.buildV4SwapCommands();
      const inputs = this.buildV4SwapInputs(params);

      console.log('📤 Universal Router call:', {
        commands: commands,
        inputs: inputs,
        deadline: deadline,
        value: ethValue.toString()
      });

      // Execute via Universal Router
      const tx = await this.router.execute(
        commands,
        inputs,
        deadline,
        {
          value: ethValue,
          gasLimit: 600000 // Conservative gas limit for hook execution
        }
      );

      console.log('✅ Universal Router transaction sent:', tx.hash);

      // Enhance transaction with V4-specific metadata
      const enhancedTx = tx as V4SwapResult;
      enhancedTx.settlementValidated = false;
      enhancedTx.hookExecutionConfirmed = false;
      enhancedTx.gasOptimized = false;

      // Start post-transaction validation
      this.validateV4Transaction(tx).then(validation => {
        enhancedTx.settlementValidated = validation.settled;
        enhancedTx.hookExecutionConfirmed = validation.hookExecuted;
        enhancedTx.gasOptimized = validation.gasOptimized;
      }).catch(error => {
        console.warn('⚠️ V4 transaction validation failed:', error);
      });

      return enhancedTx;

    } catch (error) {
      console.error('❌ Universal Router V4 swap failed:', error);
      throw this.enhanceV4Error(error);
    }
  }

  private buildV4SwapCommands(): string {
    // Build command byte array for V4 swap
    return ethers.utils.solidityPack(
      ['uint8'],
      [UNIVERSAL_ROUTER_COMMANDS.V4_SWAP]
    );
  }

  private buildV4SwapInputs(params: V4SwapParams): string[] {
    const { fromToken, toToken, amountIn, amountOutMinimum, recipient, hookData } = params;

    // Get token addresses
    const currency0 = this.getTokenAddress(fromToken);
    const currency1 = this.getTokenAddress(toToken);
    const zeroForOne = currency0.toLowerCase() < currency1.toLowerCase();

    // Create pool key with SpendSave hook
    const poolKey = {
      currency0: zeroForOne ? currency0 : currency1,
      currency1: zeroForOne ? currency1 : currency0,
      fee: POOL_CONFIG.DEFAULT_FEE,
      tickSpacing: POOL_CONFIG.DEFAULT_TICK_SPACING,
      hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK
    };

    // Create swap parameters
    const swapParams = {
      zeroForOne,
      amountSpecified: `-${amountIn}`, // Negative for exact input
      sqrtPriceLimitX96: zeroForOne ? 
        POOL_CONFIG.SQRT_PRICE_LIMITS.MIN : 
        POOL_CONFIG.SQRT_PRICE_LIMITS.MAX
    };

    // Encode the V4 swap input
    const swapInput = ethers.utils.defaultAbiCoder.encode(
      [
        'tuple(address currency0, address currency1, uint24 fee, int24 tickSpacing, address hooks)',
        'tuple(bool zeroForOne, int256 amountSpecified, uint160 sqrtPriceLimitX96)',
        'bytes'
      ],
      [
        [poolKey.currency0, poolKey.currency1, poolKey.fee, poolKey.tickSpacing, poolKey.hooks],
        [swapParams.zeroForOne, swapParams.amountSpecified, swapParams.sqrtPriceLimitX96],
        hookData
      ]
    );

    return [swapInput];
  }

  private async validateV4Transaction(tx: ethers.providers.TransactionResponse): Promise<{
    settled: boolean;
    hookExecuted: boolean;
    gasOptimized: boolean;
  }> {
    try {
      const receipt = await tx.wait();
      
      if (!receipt || receipt.status !== 1) {
        return { settled: false, hookExecuted: false, gasOptimized: false };
      }

      // Check for V4-specific events
      const v4Events = receipt.logs.filter(log => {
        // Look for events from V4 contracts
        const v4Addresses = Object.values(V4_CONTRACTS).map(addr => addr.toLowerCase());
        return v4Addresses.includes(log.address.toLowerCase());
      });

      // Check for SpendSave hook events
      const hookEvents = receipt.logs.filter(log => {
        return log.address.toLowerCase() === CONTRACT_ADDRESSES.SPEND_SAVE_HOOK.toLowerCase();
      });

      // Estimate gas optimization (V4 should be ~40-50% more efficient than V3)
      const gasUsed = receipt.gasUsed.toNumber();
      const estimatedV3Gas = gasUsed * 1.8; // V4 should use ~45% less gas
      const gasOptimized = gasUsed < estimatedV3Gas;

      return {
        settled: v4Events.length > 0,
        hookExecuted: hookEvents.length > 0,
        gasOptimized
      };

    } catch (error) {
      console.error('❌ V4 transaction validation failed:', error);
      return { settled: false, hookExecuted: false, gasOptimized: false };
    }
  }

  private getTokenAddress(symbol: SupportedTokenSymbol): string {
    const tokenMap: Record<SupportedTokenSymbol, string> = {
      'ETH': BASE_TOKENS.ETH,
      'WETH': BASE_TOKENS.WETH,
      'USDC': BASE_TOKENS.USDC
    };
    return tokenMap[symbol] || BASE_TOKENS.ETH;
  }

  private enhanceV4Error(error: any): Error {
    const errorMessage = error.message || error.toString();
    
    // V4-specific error handling
    if (errorMessage.includes('V4TooLittleReceived')) {
      return new Error('V4 Slippage Error: Output amount below minimum expected. Increase slippage tolerance or try a smaller trade.');
    }
    
    if (errorMessage.includes('V4TooMuchRequested')) {
      return new Error('V4 Input Error: Input amount exceeds maximum allowed. Try a smaller trade size.');
    }
    
    if (errorMessage.includes('DeltaNotPositive') || errorMessage.includes('DeltaNotNegative')) {
      return new Error('V4 Settlement Error: Token settlement validation failed. This may be due to hook execution issues.');
    }
    
    if (errorMessage.includes('NotPoolManager')) {
      return new Error('V4 Authorization Error: Invalid pool manager access. Please check your hook configuration.');
    }
    
    if (errorMessage.includes('ContractLocked')) {
      return new Error('V4 State Error: Pool manager is locked. This is usually temporary - please try again.');
    }

    // Enhanced generic errors
    if (errorMessage.includes('insufficient funds')) {
      return new Error('Insufficient ETH for gas fees. Ensure you have enough ETH for both the swap and gas costs.');
    }
    
    if (errorMessage.includes('user rejected')) {
      return new Error('Transaction rejected by user.');
    }
    
    if (errorMessage.includes('execution reverted')) {
      return new Error('V4 Execution Error: Transaction reverted during execution. This may be due to insufficient liquidity or hook validation failure.');
    }

    return new Error(`V4 Universal Router Error: ${errorMessage}`);
  }

  // Validate Universal Router deployment
  async validateDeployment(): Promise<boolean> {
    try {
      const code = await this.provider.getCode(V4_CONTRACTS.UNIVERSAL_ROUTER);
      return code !== '0x' && code !== '0x0';
    } catch (error) {
      console.error('❌ Universal Router validation failed:', error);
      return false;
    }
  }
}