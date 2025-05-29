import { ethers } from 'ethers';
import { V4_CONTRACTS, BASE_TOKENS, POOL_CONFIG } from './v4Constants';
import QuoterABI from '@/abi/routing/Quoter.json';
import { CONTRACT_ADDRESSES } from '../contracts';
import type { SupportedTokenSymbol } from './tokens';

export interface QuoteParams {
  fromToken: SupportedTokenSymbol;
  toToken: SupportedTokenSymbol;
  amountIn: string;
  hookData?: string;
}

export interface QuoteResult {
  amountOut: string;
  gasEstimate: string;
  priceImpact: number;
  route: string;
}

export class V4QuoterClient {
  private quoter: ethers.Contract;
  private provider: ethers.providers.Provider;

  constructor(provider: ethers.providers.Provider) {
    this.provider = provider;
    this.quoter = new ethers.Contract(
      V4_CONTRACTS.QUOTER,
      QuoterABI,
      provider
    );
  }

  async getQuote(params: QuoteParams): Promise<QuoteResult> {
    const { fromToken, toToken, amountIn, hookData = '0x' } = params;

    // Get token addresses
    const currency0 = this.getTokenAddress(fromToken);
    const currency1 = this.getTokenAddress(toToken);
    const zeroForOne = currency0.toLowerCase() < currency1.toLowerCase();

    // Create pool key with your SpendSave hook
    const poolKey = {
      currency0: zeroForOne ? currency0 : currency1,
      currency1: zeroForOne ? currency1 : currency0,
      fee: POOL_CONFIG.DEFAULT_FEE,
      tickSpacing: POOL_CONFIG.DEFAULT_TICK_SPACING,
      hooks: CONTRACT_ADDRESSES.SPEND_SAVE_HOOK // Your hook address
    };

    // Parse amount
    const exactAmount = ethers.utils.parseUnits(amountIn, 18).toString();

    // Build quote parameters
    const quoteParams = {
      poolKey,
      zeroForOne,
      exactAmount,
      hookData
    };

    console.log('🔍 Getting V4 quote with hook:', {
      poolKey,
      exactAmount,
      hookData
    });

    try {
      const [amountOut, gasEstimate] = await this.quoter.quoteExactInputSingle(quoteParams);
      
      const formattedAmountOut = ethers.utils.formatUnits(amountOut, 18);
      const priceImpact = this.calculatePriceImpact(amountIn, formattedAmountOut);

      return {
        amountOut: formattedAmountOut,
        gasEstimate: gasEstimate.toString(),
        priceImpact,
        route: `${fromToken} → ${toToken} (via SpendSave Hook)`
      };

    } catch (error) {
      console.error('❌ V4 quote failed:', error);
      
      // Enhanced error handling for hook-specific issues
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      if (errorMessage.includes('NotEnoughLiquidity')) {
        throw new Error('Insufficient liquidity in V4 pool for this trade size');
      } else if (errorMessage.includes('PoolNotInitialized')) {
        throw new Error('V4 pool not initialized for this token pair');
      } else if (errorMessage.includes('UnexpectedRevertBytes')) {
        throw new Error('SpendSave hook rejected this swap configuration');
      }
      
      throw new Error(`V4 quote failed: ${errorMessage}`);
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

  private calculatePriceImpact(amountIn: string, amountOut: string): number {
    // Simple price impact calculation
    // In production, you'd want to compare against a reference price
    const inputValue = parseFloat(amountIn);
    const outputValue = parseFloat(amountOut);
    
    if (inputValue === 0) return 0;
    
    // This is a simplified calculation - you'd want to use actual market rates
    const expectedOutput = inputValue; // Assuming 1:1 for simplicity
    const impact = Math.abs((expectedOutput - outputValue) / expectedOutput) * 100;
    
    return Math.min(impact, 100); // Cap at 100%
  }

  // Validate that the hook-enabled pool exists
  async validatePoolExists(fromToken: SupportedTokenSymbol, toToken: SupportedTokenSymbol): Promise<boolean> {
    try {
      await this.getQuote({
        fromToken,
        toToken,
        amountIn: '0.01' // Small test amount
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      return !errorMessage.includes('PoolNotInitialized');
    }
  }
}