import axios from 'axios';

interface BaseScanEthPriceResponse {
  status: string;
  message: string;
  result: {
    ethusd: string;
    ethusd_timestamp: string;
  };
}

export class BaseScanClient {
  private apiKey: string;
  private baseUrl: string = 'https://api.basescan.org/api';
  private cachedEthPrice: number | null = null;
  private lastPriceUpdate: number = 0;
  private readonly CACHE_TTL_MS: number = 5 * 60 * 1000; // 5 minutes cache
  private readonly DEFAULT_ETH_PRICE: number = 2500; // Default fallback price
  
  constructor(apiKey: string) {
    this.apiKey = apiKey;
    
    if (!apiKey) {
      console.warn('No BaseScan API key provided. Using default ETH price.');
    }
  }
  
  /**
   * Fetches the current ETH price in USD from BaseScan
   * @returns The current ETH price in USD
   */
  async getEthPrice(): Promise<number> {
    // If no API key is provided, return default value immediately
    if (!this.apiKey) {
      return this.DEFAULT_ETH_PRICE;
    }
    
    // Check if we have a cached price that's still valid
    const now = Date.now();
    if (this.cachedEthPrice !== null && now - this.lastPriceUpdate < this.CACHE_TTL_MS) {
      console.debug('Using cached ETH price:', this.cachedEthPrice);
      return this.cachedEthPrice;
    }
    
    try {
      const response = await axios.get<BaseScanEthPriceResponse>(
        `${this.baseUrl}?module=stats&action=ethprice&apikey=${this.apiKey}`
      );
      
      // Handle both error formats from BaseScan API
      if (response.data.status !== '1' && response.data.message !== 'OK') {
        console.warn(`BaseScan API returned error status: ${response.data.message}`);
        return this.DEFAULT_ETH_PRICE;
      }
      
      // Sometimes the API returns status 1 but no eth price or empty data
      if (!response.data.result || !response.data.result.ethusd) {
        console.warn('BaseScan API returned no ETH price data');
        return this.DEFAULT_ETH_PRICE;
      }
      
      // Update cache
      this.cachedEthPrice = parseFloat(response.data.result.ethusd);
      this.lastPriceUpdate = now;
      
      console.debug('Fetched fresh ETH price from BaseScan:', this.cachedEthPrice);
      return this.cachedEthPrice;
    } catch (error) {
      console.warn('Failed to fetch ETH price from BaseScan, using default value:', error);
      
      // If we have a cached price, return it even if expired
      if (this.cachedEthPrice !== null) {
        console.debug('Using expired cached ETH price:', this.cachedEthPrice);
        return this.cachedEthPrice;
      }
      
      // Fall back to default value
      return this.DEFAULT_ETH_PRICE;
    }
  }
} 