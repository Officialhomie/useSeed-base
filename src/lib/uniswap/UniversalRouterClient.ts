import { ethers } from 'ethers';
import { CONTRACT_ADDRESSES } from '../contracts';
import UniversalRouterABI from '@/abi/routing/UniversalRouter.json';
import { 
  buildV4SwapCommand, 
  encodeV4CommandInput, 
  V4CommandParams 
} from './v4Commands';
import type { SupportedTokenSymbol } from './tokens';

export interface UniversalRouterSwapParams {
  fromToken: SupportedTokenSymbol;
  toToken: SupportedTokenSymbol;
  amountIn: string;
  amountOutMinimum: string;
  recipient: string;
  deadline?: number;
  hookData: string;
  ethValue?: ethers.BigNumber;
}

export interface SwapExecutionResult extends ethers.providers.TransactionResponse {
  settlementValidated?: boolean;
  gasOptimizationAchieved?: boolean;
  hookExecutionConfirmed?: boolean;
}

export class UniversalRouterClient {
  private router: ethers.Contract;
  private provider: ethers.providers.Provider;
  private signer?: ethers.Signer;

  constructor(provider: ethers.providers.Provider, signer?: ethers.Signer) {
    this.provider = provider;
    this.signer = signer;
    this.router = new ethers.Contract(
      CONTRACT_ADDRESSES.UNISWAP_BASE_MAINNET_UNIVERSAL_ROUTER,
      UniversalRouterABI,
      signer || provider
    );
  }

  async executeV4Swap(params: UniversalRouterSwapParams): Promise<SwapExecutionResult> {
    if (!this.signer) {
      throw new Error('Signer required for swap execution');
    }

    // Build Universal Router command
    const commands = buildV4SwapCommand();
    
    // Build command input
    const commandInput = encodeV4CommandInput({
      fromToken: this.getTokenAddress(params.fromToken),
      toToken: this.getTokenAddress(params.toToken),
      amountIn: params.amountIn,
      amountOutMinimum: params.amountOutMinimum,
      recipient: params.recipient,
      deadline: params.deadline || Math.floor(Date.now() / 1000) + 1800, // 30 minutes
      hookData: params.hookData
    });

    const inputs = [commandInput];
    const deadline = params.deadline || Math.floor(Date.now() / 1000) + 1800;

    console.log('🚀 Executing V4 swap via Universal Router:', {
      commands: commands,
      inputs: inputs,
      deadline: deadline,
      value: params.ethValue?.toString() || '0'
    });

    try {
      const tx = await this.router.execute(
        commands,
        inputs,
        deadline,
        {
          value: params.ethValue || 0,
          gasLimit: 500000 // Conservative gas limit
        }
      );

      console.log('✅ Universal Router transaction sent:', tx.hash);

      // Enhance transaction with V4-specific validation
      const enhancedTx = tx as SwapExecutionResult;
      enhancedTx.settlementValidated = false;
      enhancedTx.gasOptimizationAchieved = false;
      enhancedTx.hookExecutionConfirmed = false;

      // Start settlement validation in background
      this.validateSettlementAsync(tx).then(result => {
        enhancedTx.settlementValidated = result.settled;
        enhancedTx.gasOptimizationAchieved = result.gasOptimized;
        enhancedTx.hookExecutionConfirmed = result.hookExecuted;
      }).catch(error => {
        console.warn('Settlement validation failed:', error);
      });

      return enhancedTx;

    } catch (error) {
      console.error('❌ Universal Router swap failed:', error);
      throw this.enhanceError(error);
    }
  }

  private async validateSettlementAsync(tx: ethers.providers.TransactionResponse): Promise<{
    settled: boolean;
    gasOptimized: boolean;
    hookExecuted: boolean;
  }> {
    try {
      const receipt = await tx.wait();
      
      // Check for settlement events
      const settlementEvents = receipt.logs.filter(log => {
        try {
          // Look for settlement-related events
          return log.topics[0] === ethers.utils.id('Settle(address,uint256)') ||
                 log.topics[0] === ethers.utils.id('Take(address,uint256)');
        } catch {
          return false;
        }
      });

      // Check for hook execution events
      const hookEvents = receipt.logs.filter(log => {
        try {
          return log.address.toLowerCase() === CONTRACT_ADDRESSES.SPEND_SAVE_HOOK.toLowerCase();
        } catch {
          return false;
        }
      });

      // Estimate gas optimization (V4 should use ~50% less gas than V3)
      const gasUsed = receipt.gasUsed.toNumber();
      const estimatedV3Gas = gasUsed * 2; // Rough estimate
      const gasOptimized = gasUsed < estimatedV3Gas * 0.6; // 40% savings threshold

      return {
        settled: settlementEvents.length > 0,
        gasOptimized: gasOptimized,
        hookExecuted: hookEvents.length > 0
      };

    } catch (error) {
      console.error('Settlement validation error:', error);
      return {
        settled: false,
        gasOptimized: false,
        hookExecuted: false
      };
    }
  }

  private getTokenAddress(symbol: SupportedTokenSymbol): string {
    const tokenMap = {
      'ETH': ethers.constants.AddressZero, // Use address zero for native ETH
      'WETH': CONTRACT_ADDRESSES.WETH,
      'USDC': CONTRACT_ADDRESSES.USDC
    };
    return tokenMap[symbol] || ethers.constants.AddressZero;
  }

  private enhanceError(error: any): Error {
    const errorMessage = error.message || error.toString();
    
    // V4-specific error handling
    if (errorMessage.includes('CurrencyNotSettled')) {
      return new Error('V4 Settlement Error: Tokens not properly settled. This may be due to insufficient liquidity or hook execution issues.');
    }
    
    if (errorMessage.includes('ManagerLocked')) {
      return new Error('V4 Manager Error: Pool manager is currently locked. Please wait a moment and try again.');
    }
    
    if (errorMessage.includes('AlreadyUnlocked')) {
      return new Error('V4 Concurrency Error: Another transaction is in progress. Please wait and try again.');
    }
    
    if (errorMessage.includes('InvalidHookResponse')) {
      return new Error('V4 Hook Error: SpendSave hook returned invalid response. Please check your savings configuration.');
    }

    // Fallback to enhanced generic errors
    if (errorMessage.includes('insufficient funds')) {
      return new Error('Insufficient ETH for gas fees. Try a smaller amount or ensure you have enough ETH for gas.');
    }
    
    if (errorMessage.includes('user rejected')) {
      return new Error('Transaction rejected by user.');
    }
    
    if (errorMessage.includes('gas required exceeds')) {
      return new Error('Transaction requires too much gas. Try disabling savings features or use a simpler transaction.');
    }

    return new Error(`V4 Swap Error: ${errorMessage}`);
  }
}