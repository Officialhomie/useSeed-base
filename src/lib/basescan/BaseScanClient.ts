import axios from 'axios';
import { CONTRACT_ADDRESSES } from '../contracts';
import { BASESCAN_API_URL, getBaseScanApiKey, FALLBACK_PRICES } from './BaseScanConfig';

interface BaseScanEthPriceResponse {
  status: string;
  message: string;
  result: {
    ethusd: string;
    ethusd_timestamp: string;
  };
}

interface BaseScanTokenPriceResponse {
  status: string;
  message: string;
  result: {
    tokenPrice: string;
    updatedAt: string;
  };
}

export class BaseScanClient {
  private apiKey: string;
  private baseUrl: string = BASESCAN_API_URL;
  private cachedEthPrice: number | null = null;
  private lastPriceUpdate: number = 0;
  private readonly CACHE_TTL_MS: number = 5 * 60 * 1000; // 5 minutes cache
  
  // Fallback prices when API fails - only used as last resort
  private readonly FALLBACK_ETH_PRICE: number = FALLBACK_PRICES.ETH;
  private readonly FALLBACK_TOKEN_PRICES: Record<string, number> = FALLBACK_PRICES;
  
  // Token price cache map - address -> {price, timestamp}
  private tokenPriceCache: Map<string, { price: number, timestamp: number }> = new Map();
  
  constructor(apiKey?: string) {
    // If apiKey is not provided, try to get it from the config
    this.apiKey = apiKey || getBaseScanApiKey();
    
    if (!this.apiKey) {
      console.warn('No BaseScan API key provided. Asset prices will use fallbacks.');
    }
  }
  
  /**
   * Fetches the current ETH price in USD from BaseScan
   * @returns The current ETH price in USD
   */
  async getEthPrice(): Promise<number> {
    // Check if we have a cached price that's still valid
    const now = Date.now();
    if (this.cachedEthPrice !== null && now - this.lastPriceUpdate < this.CACHE_TTL_MS) {
      console.debug('Using cached ETH price:', this.cachedEthPrice);
      return this.cachedEthPrice;
    }
    
    // If no API key is provided, use fallback
    if (!this.apiKey) {
      console.warn('No BaseScan API key provided. Using fallback ETH price.');
      return this.FALLBACK_ETH_PRICE;
    }
    
    try {
      // Use the correct endpoint - module=stats&action=ethprice
      const response = await axios.get<BaseScanEthPriceResponse>(
        `${this.baseUrl}?module=stats&action=ethprice&apikey=${this.apiKey}`,
        { timeout: 5000 } // Add timeout to prevent long-hanging requests
      );
      
      // Handle both error formats from BaseScan API
      if (response.data.status !== '1' && response.data.message !== 'OK') {
        console.warn(`BaseScan API returned error status: ${response.data.message}`);
        
        // Return cached price if available, even if expired
        if (this.cachedEthPrice !== null) {
          console.debug('Using expired cached ETH price:', this.cachedEthPrice);
          return this.cachedEthPrice;
        }
        
        // Use fallback price as last resort
        console.warn('No cached price available. Using fallback ETH price.');
        return this.FALLBACK_ETH_PRICE;
      }
      
      // Sometimes the API returns status 1 but no eth price or empty data
      if (!response.data.result || !response.data.result.ethusd) {
        console.warn('BaseScan API returned no ETH price data');
        
        // Return cached price if available, even if expired
        if (this.cachedEthPrice !== null) {
          console.debug('Using expired cached ETH price:', this.cachedEthPrice);
          return this.cachedEthPrice;
        }
        
        // Use fallback price as last resort
        console.warn('No cached price available. Using fallback ETH price.');
        return this.FALLBACK_ETH_PRICE;
      }
      
      // Update cache
      this.cachedEthPrice = parseFloat(response.data.result.ethusd);
      this.lastPriceUpdate = now;
      
      console.debug('Fetched fresh ETH price from BaseScan:', this.cachedEthPrice);
      return this.cachedEthPrice;
    } catch (error) {
      console.warn('Failed to fetch ETH price from BaseScan:', error);
      
      // Return cached price if available, even if expired
      if (this.cachedEthPrice !== null) {
        console.debug('Using expired cached ETH price:', this.cachedEthPrice);
        return this.cachedEthPrice;
      }
      
      // Use fallback price as last resort
      console.warn('No cached price available. Using fallback ETH price.');
      return this.FALLBACK_ETH_PRICE;
    }
  }
  
  /**
   * Fetches the current token price in USD from BaseScan
   * @param tokenAddress The ERC20 token contract address
   * @returns The current token price in USD
   */
  async getTokenPrice(tokenAddress: string): Promise<number> {
    const tokenAddressLower = tokenAddress.toLowerCase();
    
    // Check if we have a cached price that's still valid
    const now = Date.now();
    const cachedData = this.tokenPriceCache.get(tokenAddressLower);
    
    if (cachedData && now - cachedData.timestamp < this.CACHE_TTL_MS) {
      console.debug(`Using cached price for token ${tokenAddress}:`, cachedData.price);
      return cachedData.price;
    }
    
    // If no API key is provided, look for a fallback price by address
    if (!this.apiKey) {
      console.warn(`No BaseScan API key provided. Looking for fallback price for token ${tokenAddress}.`);
      
      // Try to find token symbol based on address
      const tokenSymbol = this.findTokenSymbolByAddress(tokenAddressLower);
      if (tokenSymbol && this.FALLBACK_TOKEN_PRICES[tokenSymbol]) {
        return this.FALLBACK_TOKEN_PRICES[tokenSymbol];
      }
      
      // If we're asking for WETH, return ETH price
      if (tokenAddressLower === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
        return this.getEthPrice();
      }
      
      // Default fallback for unknown tokens
      return 0;
    }
    
    try {
      // Note: BaseScan doesn't appear to have a direct tokenprice endpoint like Etherscan
      // For tokens, we'll first try to see if it's a known token like WETH
      
      // For WETH, use ETH price
      if (tokenAddressLower === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
        const ethPrice = await this.getEthPrice();
        
        // Cache the WETH price
        this.tokenPriceCache.set(tokenAddressLower, {
          price: ethPrice,
          timestamp: now
        });
        
        return ethPrice;
      }
      
      // For USDC and other stablecoins, use known values
      if (tokenAddressLower === CONTRACT_ADDRESSES.USDC.toLowerCase()) {
        // Cache the USDC price
        this.tokenPriceCache.set(tokenAddressLower, {
          price: 1.0, // USDC is a stablecoin pegged to USD
          timestamp: now
        });
        
        return 1.0;
      }
      
      // For other tokens, we need to use the token module (requires API PRO)
      // For now, we'll use fallbacks for known tokens or return 0
      
      const tokenSymbol = this.findTokenSymbolByAddress(tokenAddressLower);
      if (tokenSymbol && this.FALLBACK_TOKEN_PRICES[tokenSymbol]) {
        const price = this.FALLBACK_TOKEN_PRICES[tokenSymbol];
        
        // Cache the price
        this.tokenPriceCache.set(tokenAddressLower, {
          price,
          timestamp: now
        });
        
        return price;
      }
      
      // If all fails, return 0 price
      console.warn(`No price available for token ${tokenAddress}`);
      return 0;
    } catch (error) {
      console.warn(`Failed to fetch price for token ${tokenAddress}:`, error);
      
      // Return cached price if available, even if expired
      if (cachedData) {
        console.debug(`Using expired cached price for token ${tokenAddress}:`, cachedData.price);
        return cachedData.price;
      }
      
      // Try to find token symbol based on address for fallback
      const tokenSymbol = this.findTokenSymbolByAddress(tokenAddressLower);
      if (tokenSymbol && this.FALLBACK_TOKEN_PRICES[tokenSymbol]) {
        return this.FALLBACK_TOKEN_PRICES[tokenSymbol];
      }
      
      // If we're asking for WETH, return ETH price
      if (tokenAddressLower === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
        return this.getEthPrice();
      }
      
      // Default fallback for unknown tokens
      return 0;
    }
  }
  
  /**
   * Generic asset price getter - gets price for any asset (ETH or token)
   * @param assetAddress Address of the asset or "ETH" for native ETH
   * @returns The current price in USD
   */
  async getAssetPrice(assetAddress: string): Promise<number> {
    // Special case for ETH
    if (assetAddress.toLowerCase() === 'eth' || 
        assetAddress.toLowerCase() === CONTRACT_ADDRESSES.ETH.toLowerCase()) {
      return this.getEthPrice();
    }
    
    // Special case for WETH - also uses ETH price
    if (assetAddress.toLowerCase() === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
      return this.getEthPrice();
    }
    
    // For all other ERC20 tokens
    return this.getTokenPrice(assetAddress);
  }
  
  /**
   * Helper method to find a token symbol by its address
   * @param address Lowercase token address
   * @returns Token symbol if found, null otherwise
   */
  private findTokenSymbolByAddress(address: string): string | null {
    // Check if address is WETH
    if (address === CONTRACT_ADDRESSES.WETH.toLowerCase()) {
      return 'WETH';
    }
    
    // Check if address is USDC
    if (address === CONTRACT_ADDRESSES.USDC.toLowerCase()) {
      return 'USDC';
    }
    
    // Add other token mappings as needed
    return null;
  }
} 