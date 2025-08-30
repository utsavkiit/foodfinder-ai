import axios, { AxiosResponse } from 'axios';
import { googleConfig } from '../utils/env';
import { logger } from '../utils/logger';
import { 
  GoogleSearchQuery, 
  GoogleSearchResponse, 
  GoogleSearchResult,
  Restaurant,
  RestaurantSearchParams,
  RestaurantSearchResult,
  DataSource,
  PriceRange,
  FeatureCategory,
  RestaurantFeature
} from '../types';

export class GoogleSearchTool {
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private readonly logger = logger;

  constructor() {
    this.logger.info('Google Search Tool initialized');
  }

  /**
   * Search for restaurants using Google Custom Search API
   */
  async searchRestaurants(params: RestaurantSearchParams): Promise<RestaurantSearchResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Searching for restaurants: "${params.query}" in ${params.location}`);

      // Build Google search query
      const searchQuery = this.buildSearchQuery(params);
      
      // Execute search
      const response = await this.executeSearch(searchQuery);
      
      // Parse and transform results
      const restaurants = this.parseSearchResults(response, params);
      
      const searchTime = Date.now() - startTime;
      
      this.logger.info(`Google search completed in ${searchTime}ms`, {
        query: params.query,
        location: params.location,
        results: restaurants.length,
        searchTime
      });

      return {
        restaurants,
        totalResults: restaurants.length,
        searchParams: params,
        searchTime
      };

    } catch (error) {
      const searchTime = Date.now() - startTime;
      this.logger.errorWithStack('Google search failed', error as Error, {
        query: params.query,
        location: params.location,
        searchTime
      });
      
      throw new Error(`Google search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build Google Custom Search query from restaurant search parameters
   */
  private buildSearchQuery(params: RestaurantSearchParams): GoogleSearchQuery {
    // Enhance search query with restaurant-specific terms
    let enhancedQuery = params.query;
    
    // Add location context
    if (params.location) {
      enhancedQuery += ` restaurant ${params.location}`;
    }
    
    // Add cuisine context if specified
    if (params.cuisine && params.cuisine.length > 0) {
      enhancedQuery += ` ${params.cuisine.join(' ')}`;
    }
    
    // Add price range context
    if (params.priceRange && params.priceRange.length > 0) {
      const priceTerms = params.priceRange.map(price => {
        switch (price) {
          case PriceRange.BUDGET: return 'cheap affordable';
          case PriceRange.MODERATE: return 'moderate price';
          case PriceRange.EXPENSIVE: return 'upscale fine dining';
          case PriceRange.VERY_EXPENSIVE: return 'luxury expensive';
          default: return '';
        }
      }).filter(term => term);
      
      if (priceTerms.length > 0) {
        enhancedQuery += ` ${priceTerms.join(' ')}`;
      }
    }

    return {
      query: enhancedQuery,
      cseId: googleConfig.cseId,
      apiKey: googleConfig.apiKey,
      safeSearch: 'off'
    };
  }

  /**
   * Execute the Google Custom Search API request
   */
  private async executeSearch(query: GoogleSearchQuery): Promise<GoogleSearchResponse> {
    const url = new URL(this.baseUrl);
    
    // Add query parameters
    url.searchParams.append('key', query.apiKey);
    url.searchParams.append('cx', query.cseId);
    url.searchParams.append('q', query.query);
    url.searchParams.append('safe', query.safeSearch || 'off');
    
    // Add search type if specified
    if (query.searchType) {
      url.searchParams.append('searchType', query.searchType);
    }

    try {
      const response: AxiosResponse<GoogleSearchResponse> = await axios.get(url.toString(), {
        timeout: 10000, // 10 second timeout
        headers: {
          'Accept': 'application/json',
          'User-Agent': 'FoodFinder-AI/1.0.0'
        }
      });

      this.logger.apiCall(url.pathname, 'GET', response.status, Date.now());
      
      if (response.status !== 200) {
        throw new Error(`Google API returned status ${response.status}: ${response.statusText}`);
      }

      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // API error response
          throw new Error(`Google API error: ${error.response.status} - ${error.response.data?.error?.message || error.message}`);
        } else if (error.request) {
          // Network error
          throw new Error(`Network error: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Parse Google search results into Restaurant objects
   */
  private parseSearchResults(response: GoogleSearchResponse, searchParams: RestaurantSearchParams): Restaurant[] {
    if (!response.items || response.items.length === 0) {
      this.logger.warn('No search results returned from Google API');
      return [];
    }

    const restaurants: Restaurant[] = [];

    for (const item of response.items) {
      try {
        const restaurant = this.parseSearchResult(item, searchParams);
        if (restaurant) {
          restaurants.push(restaurant);
        }
      } catch (error) {
        this.logger.warn('Failed to parse search result', {
          item: item.title,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    this.logger.debug(`Parsed ${restaurants.length} restaurants from ${response.items.length} search results`);
    return restaurants;
  }

  /**
   * Parse individual Google search result into Restaurant object
   */
  private parseSearchResult(item: GoogleSearchResult, searchParams: RestaurantSearchParams): Restaurant | null {
    // Skip non-restaurant results
    if (!this.isRestaurantResult(item)) {
      return null;
    }

    // Extract basic information
    const name = this.extractRestaurantName(item.title);
    const address = this.extractAddress(item.snippet, item.displayLink);
    const city = this.extractCity(address, searchParams.location);
    const state = this.extractState(address);
    const zipCode = this.extractZipCode(address);

    // Create restaurant object
    const restaurant: Restaurant = {
      id: this.generateRestaurantId(item.link, name),
      name,
      address: address || 'Address not available',
      city: city || 'City not available',
      state: state || 'State not available',
      zipCode: zipCode || 'ZIP not available',
      phone: this.extractPhone(item.snippet),
      website: item.link,
      cuisine: this.extractCuisine(item.snippet, item.title),
      priceRange: this.extractPriceRange(item.snippet, item.title),
      rating: this.extractRating(item.snippet, item.title),
      reviewCount: this.extractReviewCount(item.snippet, item.title),
      coordinates: undefined, // Google Custom Search doesn't provide coordinates
      hours: undefined, // Google Custom Search doesn't provide hours
      features: this.extractFeatures(item.snippet, item.title),
      images: undefined, // Google Custom Search doesn't provide images
      source: DataSource.GOOGLE,
      lastUpdated: new Date()
    };

    return restaurant;
  }

  /**
   * Check if search result is likely a restaurant
   */
  private isRestaurantResult(item: GoogleSearchResult): boolean {
    const text = `${item.title} ${item.snippet}`.toLowerCase();
    
    // Restaurant indicators
    const restaurantTerms = [
      'restaurant', 'cafe', 'bistro', 'diner', 'grill', 'kitchen',
      'pizzeria', 'tavern', 'pub', 'bar', 'eatery', 'food',
      'menu', 'dining', 'cuisine', 'chef', 'kitchen'
    ];

    // Location indicators
    const locationTerms = [
      'street', 'avenue', 'road', 'drive', 'lane', 'plaza',
      'center', 'mall', 'district', 'neighborhood'
    ];

    const hasRestaurantTerm = restaurantTerms.some(term => text.includes(term));
    const hasLocationTerm = locationTerms.some(term => text.includes(term));

    return hasRestaurantTerm && hasLocationTerm;
  }

  /**
   * Extract restaurant name from title
   */
  private extractRestaurantName(title: string): string {
    // Remove common suffixes and prefixes
    let name = title
      .replace(/\s*-\s*.*$/, '') // Remove everything after dash
      .replace(/^.*?\s*-\s*/, '') // Remove everything before dash
      .replace(/\s*restaurant\s*/i, ' ')
      .replace(/\s*cafe\s*/i, ' ')
      .replace(/\s*bistro\s*/i, ' ')
      .trim();

    // If name is too short, use the original title
    if (name.length < 3) {
      name = title;
    }

    return name;
  }

  /**
   * Extract address from snippet and display link
   */
  private extractAddress(snippet: string, displayLink: string): string {
    // Look for address patterns in snippet
    const addressPatterns = [
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)/i,
      /\d+\s+[A-Za-z\s]+(?:Street|St|Avenue|Ave|Road|Rd|Drive|Dr|Lane|Ln|Boulevard|Blvd)\s*,\s*[A-Za-z\s]+/i
    ];

    for (const pattern of addressPatterns) {
      const match = snippet.match(pattern);
      if (match) {
        return match[0];
      }
    }

    // Fallback to display link domain
    return displayLink;
  }

  /**
   * Extract city from address or location
   */
  private extractCity(address: string, searchLocation?: string): string {
    if (searchLocation) {
      return searchLocation.split(',')[0].trim();
    }

    // Try to extract from address
    const cityMatch = address.match(/,\s*([A-Za-z\s]+)(?:,|\s|$)/);
    if (cityMatch) {
      return cityMatch[1].trim();
    }

    return 'Unknown City';
  }

  /**
   * Extract state from address
   */
  private extractState(address: string): string {
    const stateMatch = address.match(/,\s*([A-Z]{2})\s*$/);
    if (stateMatch) {
      return stateMatch[1];
    }

    return 'Unknown State';
  }

  /**
   * Extract ZIP code from address
   */
  private extractZipCode(address: string): string {
    const zipMatch = address.match(/\d{5}(?:-\d{4})?/);
    if (zipMatch) {
      return zipMatch[0];
    }

    return 'Unknown ZIP';
  }

  /**
   * Extract phone number from snippet
   */
  private extractPhone(snippet: string): string | undefined {
    const phonePattern = /\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/;
    const match = snippet.match(phonePattern);
    return match ? match[0] : undefined;
  }

  /**
   * Extract cuisine type from snippet and title
   */
  private extractCuisine(snippet: string, title: string): string[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const cuisines: string[] = [];

    const cuisineTypes = {
      'italian': ['italian', 'pizza', 'pasta', 'ristorante'],
      'chinese': ['chinese', 'mandarin', 'cantonese', 'szechuan'],
      'mexican': ['mexican', 'taco', 'burrito', 'enchilada'],
      'japanese': ['japanese', 'sushi', 'ramen', 'tempura'],
      'indian': ['indian', 'curry', 'tandoori', 'naan'],
      'american': ['american', 'burger', 'steak', 'bbq'],
      'mediterranean': ['mediterranean', 'greek', 'lebanese', 'turkish'],
      'thai': ['thai', 'pad thai', 'curry', 'noodle'],
      'french': ['french', 'bistro', 'brasserie', 'patisserie']
    };

    for (const [cuisine, terms] of Object.entries(cuisineTypes)) {
      if (terms.some(term => text.includes(term))) {
        cuisines.push(cuisine);
      }
    }

    return cuisines.length > 0 ? cuisines : ['american'];
  }

  /**
   * Extract price range from snippet and title
   */
  private extractPriceRange(snippet: string, title: string): PriceRange {
    const text = `${title} ${snippet}`.toLowerCase();
    
    if (text.includes('$$$$') || text.includes('luxury') || text.includes('fine dining')) {
      return PriceRange.VERY_EXPENSIVE;
    } else if (text.includes('$$$') || text.includes('upscale') || text.includes('gourmet')) {
      return PriceRange.EXPENSIVE;
    } else if (text.includes('$$') || text.includes('moderate') || text.includes('casual')) {
      return PriceRange.MODERATE;
    } else {
      return PriceRange.BUDGET;
    }
  }

  /**
   * Extract rating from snippet and title
   */
  private extractRating(snippet: string, title: string): number {
    const text = `${title} ${snippet}`.toLowerCase();
    
    // Look for star ratings
    const starMatch = text.match(/(\d+(?:\.\d+)?)\s*stars?/i);
    if (starMatch) {
      const rating = parseFloat(starMatch[1]);
      return Math.min(Math.max(rating, 1), 5); // Clamp between 1-5
    }

    // Look for numerical ratings
    const ratingMatch = text.match(/(\d+(?:\.\d+)?)\s*\/\s*5/i);
    if (ratingMatch) {
      const rating = parseFloat(ratingMatch[1]);
      return Math.min(Math.max(rating, 1), 5); // Clamp between 1-5
    }

    // Default rating
    return 4.0;
  }

  /**
   * Extract review count from snippet and title
   */
  private extractReviewCount(snippet: string, title: string): number {
    const text = `${title} ${snippet}`.toLowerCase();
    
    const reviewMatch = text.match(/(\d+)\s*reviews?/i);
    if (reviewMatch) {
      return parseInt(reviewMatch[1], 10);
    }

    // Default review count
    return 50;
  }

  /**
   * Extract restaurant features from snippet and title
   */
  private extractFeatures(snippet: string, title: string): RestaurantFeature[] {
    const text = `${title} ${snippet}`.toLowerCase();
    const features: RestaurantFeature[] = [];

    // Dining features
    if (text.includes('outdoor seating') || text.includes('patio')) {
      features.push({ name: 'Outdoor Seating', value: true, category: FeatureCategory.DINING });
    }
    if (text.includes('delivery') || text.includes('takeout')) {
      features.push({ name: 'Delivery/Takeout', value: true, category: FeatureCategory.DINING });
    }
    if (text.includes('reservations')) {
      features.push({ name: 'Reservations', value: true, category: FeatureCategory.DINING });
    }

    // Payment features
    if (text.includes('credit card') || text.includes('cash only')) {
      features.push({ name: 'Credit Cards Accepted', value: !text.includes('cash only'), category: FeatureCategory.PAYMENT });
    }

    // Special features
    if (text.includes('vegetarian') || text.includes('vegan')) {
      features.push({ name: 'Vegetarian Options', value: true, category: FeatureCategory.SPECIAL });
    }
    if (text.includes('gluten free')) {
      features.push({ name: 'Gluten Free Options', value: true, category: FeatureCategory.SPECIAL });
    }

    return features;
  }

  /**
   * Generate unique restaurant ID
   */
  private generateRestaurantId(link: string, name: string): string {
    const urlHash = Buffer.from(link).toString('base64').substring(0, 8);
    const nameHash = Buffer.from(name).toString('base64').substring(0, 8);
    return `google_${urlHash}_${nameHash}`;
  }

  /**
   * Test the Google Search API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testQuery: GoogleSearchQuery = {
        query: 'test restaurant',
        cseId: googleConfig.cseId,
        apiKey: googleConfig.apiKey
      };

      const response = await this.executeSearch(testQuery);
      return response.searchInformation !== undefined;
    } catch (error) {
      this.logger.error('Google Search API connection test failed', error);
      return false;
    }
  }
}
