import axios from 'axios';
import { ethers } from 'ethers';
import { BASESCAN_API_URL, getBaseScanApiKey } from '../basescan/BaseScanConfig';

// Interface for BaseScan Gas Oracle response
interface BaseScanGasOracleResponse {
  status: string;
  message: string;
  result: {
    LastBlock: string;
    SafeGasPrice: string;
    ProposeGasPrice: string;
    FastGasPrice: string;
    suggestBaseFee: string;
    gasUsedRatio: string;
  };
}

// Interface for ETH Price response
interface BaseScanEthPriceResponse {
  status: string;
  message: string;
  result: {
    ethusd: string;
    ethusd_timestamp: string;
  };
}

// Gas price data with metadata
export interface GasPriceData {
  safe: number;          // SafeGasPrice in Gwei
  standard: number;      // ProposeGasPrice in Gwei
  fast: number;          // FastGasPrice in Gwei
  baseFee: number;       // suggestBaseFee in Gwei
  lastBlock: number;     // LastBlock number
  updatedAt: number;     // Timestamp when data was fetched
  ethUsdPrice: number;   // Current ETH price in USD
  source: 'api' | 'cache' | 'fallback'; // Source of the data
}

// Fee estimate with ETH and USD values
export interface FeeEstimate {
  feeWei: bigint;        // Fee in wei
  feeEth: string;        // Fee in ETH (formatted string)
  feeUsd: string;        // Fee in USD (formatted string)
  gasPrice: number;      // Gas price in Gwei
  gasLimit: number;      // Gas limit in units
  ethUsdPrice: number;   // ETH/USD price used for calculation
  priceCategory: 'safe' | 'standard' | 'fast'; // Selected price category
}

// Cache constants
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes
const FALLBACK_GAS_PRICE = 5; // 5 Gwei fallback

// Class to manage gas price data, with caching
export class BaseScanGasOracle {
  private apiKey: string;
  private baseUrl: string;
  private cachedGasData: GasPriceData | null = null;
  private lastUpdateTimestamp = 0;
  
  constructor(apiKey?: string) {
    this.apiKey = apiKey || getBaseScanApiKey();
    this.baseUrl = BASESCAN_API_URL;
    
    if (!this.apiKey) {
      console.warn('No BaseScan API key provided. Gas prices will use fallbacks.');
    }
  }
  
  /**
   * Fetches the latest gas prices from BaseScan API
   * @returns Gas price data
   */
  async getGasPrices(): Promise<GasPriceData> {
    const now = Date.now();
    
    // Return cached data if still valid
    if (this.cachedGasData && (now - this.lastUpdateTimestamp) < CACHE_TTL_MS) {
      return {
        ...this.cachedGasData,
        source: 'cache'
      };
    }
    
    // If no API key is provided, use fallback values
    if (!this.apiKey) {
      return this.getFallbackGasPrices();
    }
    
    try {
      // Fetch gas prices from API
      const response = await axios.get<BaseScanGasOracleResponse>(
        `${this.baseUrl}?module=gastracker&action=gasoracle&apikey=${this.apiKey}`,
        { timeout: 5000 }
      );
      
      // Check for API error response
      if (response.data.status !== '1') {
        console.warn(`BaseScan Gas API returned error: ${response.data.message}`);
        
        if (this.cachedGasData) {
          return {
            ...this.cachedGasData,
            source: 'cache'
          };
        }
        
        return this.getFallbackGasPrices();
      }
      
      // Fetch ETH price for USD calculations
      const ethPrice = await this.getEthPrice();
      
      // Parse response data
      const result = response.data.result;
      const gasData: GasPriceData = {
        safe: parseFloat(result.SafeGasPrice),
        standard: parseFloat(result.ProposeGasPrice),
        fast: parseFloat(result.FastGasPrice),
        baseFee: parseFloat(result.suggestBaseFee),
        lastBlock: parseInt(result.LastBlock),
        updatedAt: now,
        ethUsdPrice: ethPrice,
        source: 'api'
      };
      
      // Update cache
      this.cachedGasData = gasData;
      this.lastUpdateTimestamp = now;
      
      return gasData;
    } catch (error) {
      console.error('Error fetching gas prices:', error);
      
      // Use cached data if available
      if (this.cachedGasData) {
        return {
          ...this.cachedGasData,
          source: 'cache'
        };
      }
      
      // Use fallback as last resort
      return this.getFallbackGasPrices();
    }
  }
  
  /**
   * Get the current ETH price in USD
   * @returns ETH price in USD
   */
  private async getEthPrice(): Promise<number> {
    try {
      const response = await axios.get<BaseScanEthPriceResponse>(
        `${this.baseUrl}?module=stats&action=ethprice&apikey=${this.apiKey}`,
        { timeout: 5000 }
      );
      
      if (response.data.status === '1' && response.data.result.ethusd) {
        return parseFloat(response.data.result.ethusd);
      }
      
      // Fallback to cached price if available
      if (this.cachedGasData?.ethUsdPrice) {
        return this.cachedGasData.ethUsdPrice;
      }
      
      // Last resort fallback
      return 2500; // Fallback ETH price
    } catch (error) {
      console.error('Error fetching ETH price:', error);
      
      // Fallback to cached price if available
      if (this.cachedGasData?.ethUsdPrice) {
        return this.cachedGasData.ethUsdPrice;
      }
      
      // Last resort fallback
      return 2500; // Fallback ETH price
    }
  }
  
  /**
   * Create fallback gas price data when API fails
   * @returns Fallback gas price data
   */
  private getFallbackGasPrices(): GasPriceData {
    return {
      safe: FALLBACK_GAS_PRICE - 1,
      standard: FALLBACK_GAS_PRICE,
      fast: FALLBACK_GAS_PRICE + 2,
      baseFee: FALLBACK_GAS_PRICE - 0.5,
      lastBlock: 0,
      updatedAt: Date.now(),
      ethUsdPrice: 2500, // Fallback ETH price
      source: 'fallback'
    };
  }
  
  /**
   * Calculate transaction fee based on gas limit and selected price category
   * @param gasLimit Estimated gas limit for the transaction
   * @param priceCategory Price category to use (safe, standard, fast)
   * @returns Fee estimate in ETH and USD
   */
  async estimateFee(
    gasLimit: number,
    priceCategory: 'safe' | 'standard' | 'fast' = 'standard'
  ): Promise<FeeEstimate> {
    const gasData = await this.getGasPrices();
    
    // Get the gas price based on selected category
    let gasPrice = gasData.standard; // Default to standard
    if (priceCategory === 'safe') gasPrice = gasData.safe;
    if (priceCategory === 'fast') gasPrice = gasData.fast;
    
    // Calculate fee in Wei
    const gasPriceWei = ethers.utils.parseUnits(gasPrice.toString(), 'gwei');
    const feeWei = gasPriceWei.mul(ethers.BigNumber.from(gasLimit));
    
    // Calculate fee in ETH
    const feeEth = ethers.utils.formatEther(feeWei);
    
    // Calculate fee in USD
    const feeUsd = (parseFloat(feeEth) * gasData.ethUsdPrice).toFixed(2);
    
    return {
      feeWei: BigInt(feeWei.toString()),
      feeEth,
      feeUsd,
      gasPrice,
      gasLimit,
      ethUsdPrice: gasData.ethUsdPrice,
      priceCategory
    };
  }
  
  /**
   * Get gas price in Wei based on selected category
   * @param priceCategory Price category (safe, standard, fast)
   * @returns Gas price in Wei
   */
  async getGasPriceWei(priceCategory: 'safe' | 'standard' | 'fast' = 'standard'): Promise<bigint> {
    const gasData = await this.getGasPrices();
    
    let gasPrice = gasData.standard; // Default to standard
    if (priceCategory === 'safe') gasPrice = gasData.safe;
    if (priceCategory === 'fast') gasPrice = gasData.fast;
    
    const gasPriceWei = ethers.utils.parseUnits(gasPrice.toString(), 'gwei');
    return BigInt(gasPriceWei.toString());
  }
}

// Singleton instance for app-wide use
let oracleInstance: BaseScanGasOracle | null = null;

/**
 * Get the shared gas oracle instance
 * @returns BaseScanGasOracle instance
 */
export function getGasOracle(): BaseScanGasOracle {
  if (!oracleInstance) {
    oracleInstance = new BaseScanGasOracle();
  }
  return oracleInstance;
}

/**
 * Utility function to get current gas prices
 * @returns Gas price data
 */
export async function getGasPrices(): Promise<GasPriceData> {
  return getGasOracle().getGasPrices();
}

/**
 * Utility function to estimate transaction fee
 * @param gasLimit Estimated gas limit
 * @param priceCategory Price category
 * @returns Fee estimate
 */
export async function estimateTransactionFee(
  gasLimit: number,
  priceCategory: 'safe' | 'standard' | 'fast' = 'standard'
): Promise<FeeEstimate> {
  return getGasOracle().estimateFee(gasLimit, priceCategory);
} 