import axios, { AxiosResponse } from 'axios';
import { yelpConfig } from '../utils/env';
import { logger } from '../utils/logger';
import { 
  YelpSearchQuery, 
  YelpSearchResponse, 
  YelpBusiness,
  Restaurant,
  RestaurantSearchParams,
  RestaurantSearchResult,
  DataSource,
  PriceRange,
  FeatureCategory,
  RestaurantFeature,
  Coordinates,
  BusinessHours,
  DayHours
} from '../types';

export class YelpSearchTool {
  private readonly baseUrl = 'https://api.yelp.com/v3';
  private readonly logger = logger;

  constructor() {
    this.logger.info('Yelp Search Tool initialized');
  }

  /**
   * Search for restaurants using Yelp Fusion API
   */
  async searchRestaurants(params: RestaurantSearchParams): Promise<RestaurantSearchResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Searching for restaurants on Yelp: "${params.query}" in ${params.location}`);

      // Build Yelp search query
      const searchQuery = this.buildSearchQuery(params);
      
      // Execute search
      const response = await this.executeSearch(searchQuery);
      
      // Parse and transform results
      const restaurants = this.parseSearchResults(response, params);
      
      const searchTime = Date.now() - startTime;
      
      this.logger.info(`Yelp search completed in ${searchTime}ms`, {
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
      this.logger.errorWithStack('Yelp search failed', error as Error, {
        query: params.query,
        location: params.location,
        searchTime
      });
      
      throw new Error(`Yelp search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build Yelp search query from restaurant search parameters
   */
  private buildSearchQuery(params: RestaurantSearchParams): YelpSearchQuery {
    const query: YelpSearchQuery = {
      apiKey: yelpConfig.apiKey,
      term: params.query || 'restaurant',
      location: params.location,
      radius: params.radius ? Math.round(params.radius * 1609.34) : undefined, // Convert miles to meters
      openNow: params.openNow,
      maxResults: params.maxResults || 20
    };

    // Add cuisine categories if specified
    if (params.cuisine && params.cuisine.length > 0) {
      query.categories = this.mapCuisineToYelpCategories(params.cuisine);
    }

    // Add price filter if specified
    if (params.priceRange && params.priceRange.length > 0) {
      query.price = this.mapPriceRangeToYelp(params.priceRange);
    }

    // Add rating filter if specified
    if (params.rating) {
      // Yelp doesn't support rating filtering in search, but we can filter results after
      this.logger.debug(`Rating filter ${params.rating} will be applied to results`);
    }

    return query;
  }

  /**
   * Execute the Yelp Fusion API request
   */
  private async executeSearch(query: YelpSearchQuery): Promise<YelpSearchResponse> {
    const url = new URL(`${this.baseUrl}/businesses/search`);
    
    // Add query parameters
    if (query.term) url.searchParams.append('term', query.term);
    if (query.location) url.searchParams.append('location', query.location);
    if (query.latitude) url.searchParams.append('latitude', query.latitude.toString());
    if (query.longitude) url.searchParams.append('longitude', query.longitude.toString());
    if (query.radius) url.searchParams.append('radius', query.radius.toString());
    if (query.categories && query.categories.length > 0) {
      url.searchParams.append('categories', query.categories.join(','));
    }
    if (query.price) url.searchParams.append('price', query.price);
    if (query.openNow) url.searchParams.append('open_now', 'true');
    if (query.sortBy) url.searchParams.append('sort_by', query.sortBy);
    
    // Limit results
    url.searchParams.append('limit', (query.maxResults || 20).toString());

    try {
      const response: AxiosResponse<YelpSearchResponse> = await axios.get(url.toString(), {
        timeout: 15000, // 15 second timeout
        headers: {
          'Authorization': `Bearer ${query.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'FoodFinder-AI/1.0.0'
        }
      });

      this.logger.apiCall(url.pathname, 'GET', response.status, Date.now());
      
      if (response.status !== 200) {
        throw new Error(`Yelp API returned status ${response.status}: ${response.statusText}`);
      }

      return response.data;

    } catch (error) {
      if (axios.isAxiosError(error)) {
        if (error.response) {
          // API error response
          const errorMessage = error.response.data?.error?.description || error.response.data?.error?.message || error.message;
          throw new Error(`Yelp API error: ${error.response.status} - ${errorMessage}`);
        } else if (error.request) {
          // Network error
          throw new Error(`Network error: ${error.message}`);
        }
      }
      
      throw error;
    }
  }

  /**
   * Parse Yelp search results into Restaurant objects
   */
  private parseSearchResults(response: YelpSearchResponse, searchParams: RestaurantSearchParams): Restaurant[] {
    if (!response.businesses || response.businesses.length === 0) {
      this.logger.warn('No search results returned from Yelp API');
      return [];
    }

    const restaurants: Restaurant[] = [];

    for (const business of response.businesses) {
      try {
        const restaurant = this.parseBusiness(business, searchParams);
        if (restaurant) {
          restaurants.push(restaurant);
        }
      } catch (error) {
        this.logger.warn('Failed to parse Yelp business result', {
          business: business.name,
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      }
    }

    // Apply rating filter if specified
    if (searchParams.rating) {
      const filteredRestaurants = restaurants.filter(r => r.rating >= searchParams.rating!);
      this.logger.debug(`Filtered ${restaurants.length} results to ${filteredRestaurants.length} with rating >= ${searchParams.rating}`);
      return filteredRestaurants;
    }

    this.logger.debug(`Parsed ${restaurants.length} restaurants from ${response.businesses.length} Yelp results`);
    return restaurants;
  }

  /**
   * Parse individual Yelp business into Restaurant object
   */
  private parseBusiness(business: YelpBusiness, searchParams: RestaurantSearchParams): Restaurant | null {
    // Create restaurant object
    const restaurant: Restaurant = {
      id: this.generateRestaurantId(business.id, business.name),
      name: business.name,
      address: business.location.address1 || 'Address not available',
      city: business.location.city,
      state: business.location.state,
      zipCode: business.location.zip_code,
      phone: business.phone,
      website: business.url,
      cuisine: this.extractCuisineFromCategories(business.categories),
      priceRange: this.mapYelpPriceToPriceRange(business.price),
      rating: business.rating,
      reviewCount: business.review_count,
      coordinates: this.mapYelpCoordinates(business.coordinates),
      hours: undefined, // Yelp search doesn't include hours, would need separate API call
      features: this.extractFeaturesFromBusiness(business),
      images: business.image_url ? [business.image_url] : undefined,
      source: DataSource.YELP,
      lastUpdated: new Date()
    };

    return restaurant;
  }

  /**
   * Map Yelp cuisine categories to our cuisine types
   */
  private extractCuisineFromCategories(categories: Array<{ alias: string; title: string }>): string[] {
    const cuisines: string[] = [];
    
    const cuisineMapping: { [key: string]: string[] } = {
      'italian': ['italian', 'pizza', 'pasta'],
      'chinese': ['chinese', 'cantonese', 'szechuan'],
      'mexican': ['mexican', 'tacos', 'tex-mex'],
      'japanese': ['japanese', 'sushi', 'ramen'],
      'indian': ['indian', 'pakistani'],
      'american': ['american', 'newamerican', 'tradamerican', 'burgers', 'hotdogs'],
      'mediterranean': ['mediterranean', 'greek', 'lebanese', 'turkish'],
      'thai': ['thai'],
      'french': ['french', 'bistros'],
      'korean': ['korean'],
      'vietnamese': ['vietnamese'],
      'spanish': ['spanish', 'tapas'],
      'caribbean': ['caribbean'],
      'soulfood': ['soulfood'],
      'bbq': ['bbq'],
      'seafood': ['seafood'],
      'steakhouse': ['steakhouses'],
      'vegetarian': ['vegetarian'],
      'vegan': ['vegan']
    };

    for (const category of categories) {
      for (const [cuisine, aliases] of Object.entries(cuisineMapping)) {
        if (aliases.includes(category.alias) || aliases.includes(category.title.toLowerCase())) {
          if (!cuisines.includes(cuisine)) {
            cuisines.push(cuisine);
          }
        }
      }
    }

    return cuisines.length > 0 ? cuisines : ['american'];
  }

  /**
   * Map Yelp price symbols to our PriceRange enum
   */
  private mapYelpPriceToPriceRange(yelpPrice: string): PriceRange {
    switch (yelpPrice) {
      case '$':
        return PriceRange.BUDGET;
      case '$$':
        return PriceRange.MODERATE;
      case '$$$':
        return PriceRange.EXPENSIVE;
      case '$$$$':
        return PriceRange.VERY_EXPENSIVE;
      default:
        return PriceRange.MODERATE;
    }
  }

  /**
   * Map Yelp coordinates to our Coordinates interface
   */
  private mapYelpCoordinates(coords: { latitude: number; longitude: number }): Coordinates {
    return {
      latitude: coords.latitude,
      longitude: coords.longitude
    };
  }

  /**
   * Extract restaurant features from Yelp business data
   */
  private extractFeaturesFromBusiness(business: YelpBusiness): RestaurantFeature[] {
    const features: RestaurantFeature[] = [];

    // Check for delivery/takeout
    if (business.transactions.includes('delivery')) {
      features.push({ name: 'Delivery', value: true, category: FeatureCategory.DINING });
    }
    if (business.transactions.includes('pickup')) {
      features.push({ name: 'Takeout', value: true, category: FeatureCategory.DINING });
    }

    // Check if restaurant is open
    if (!business.is_closed) {
      features.push({ name: 'Currently Open', value: true, category: FeatureCategory.DINING });
    }

    // Add distance information
    if (business.distance) {
      const distanceMiles = Math.round(business.distance / 1609.34 * 10) / 10; // Convert meters to miles
      features.push({ 
        name: 'Distance', 
        value: `${distanceMiles} miles`, 
        category: FeatureCategory.OTHER 
      });
    }

    return features;
  }

  /**
   * Map our cuisine types to Yelp category aliases
   */
  private mapCuisineToYelpCategories(cuisines: string[]): string[] {
    const yelpCategories: string[] = [];
    
    const cuisineToYelpMapping: { [key: string]: string[] } = {
      'italian': ['italian', 'pizza', 'pasta'],
      'chinese': ['chinese', 'cantonese', 'szechuan'],
      'mexican': ['mexican', 'tacos', 'tex-mex'],
      'japanese': ['japanese', 'sushi', 'ramen'],
      'indian': ['indian', 'pakistani'],
      'american': ['american', 'newamerican', 'tradamerican', 'burgers', 'hotdogs'],
      'mediterranean': ['mediterranean', 'greek', 'lebanese', 'turkish'],
      'thai': ['thai'],
      'french': ['french', 'bistros'],
      'korean': ['korean'],
      'vietnamese': ['vietnamese'],
      'spanish': ['spanish', 'tapas'],
      'caribbean': ['caribbean'],
      'soulfood': ['soulfood'],
      'bbq': ['bbq'],
      'seafood': ['seafood'],
      'steakhouse': ['steakhouses'],
      'vegetarian': ['vegetarian'],
      'vegan': ['vegan']
    };

    for (const cuisine of cuisines) {
      const yelpCats = cuisineToYelpMapping[cuisine.toLowerCase()];
      if (yelpCats) {
        yelpCategories.push(...yelpCats);
      }
    }

    return yelpCategories;
  }

  /**
   * Map our price ranges to Yelp price format
   */
  private mapPriceRangeToYelp(priceRanges: PriceRange[]): string {
    const yelpPrices: string[] = [];
    
    for (const price of priceRanges) {
      switch (price) {
        case PriceRange.BUDGET:
          yelpPrices.push('1');
          break;
        case PriceRange.MODERATE:
          yelpPrices.push('2');
          break;
        case PriceRange.EXPENSIVE:
          yelpPrices.push('3');
          break;
        case PriceRange.VERY_EXPENSIVE:
          yelpPrices.push('4');
          break;
      }
    }

    return yelpPrices.join(',');
  }

  /**
   * Generate unique restaurant ID
   */
  private generateRestaurantId(yelpId: string, name: string): string {
    const idHash = Buffer.from(yelpId).toString('base64').substring(0, 8);
    const nameHash = Buffer.from(name).toString('base64').substring(0, 8);
    return `yelp_${idHash}_${nameHash}`;
  }

  /**
   * Test the Yelp Fusion API connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const testQuery: YelpSearchQuery = {
        apiKey: yelpConfig.apiKey,
        term: 'test',
        location: 'San Francisco',
        maxResults: 1
      };

      const response = await this.executeSearch(testQuery);
      return response.businesses !== undefined;
    } catch (error) {
      this.logger.error('Yelp Fusion API connection test failed', error);
      return false;
    }
  }

  /**
   * Get detailed business information (for future use)
   * This would require a separate API call to /businesses/{id}
   */
  async getBusinessDetails(businessId: string): Promise<any> {
    try {
      const url = `${this.baseUrl}/businesses/${businessId}`;
      
      const response = await axios.get(url, {
        timeout: 15000,
        headers: {
          'Authorization': `Bearer ${yelpConfig.apiKey}`,
          'Accept': 'application/json',
          'User-Agent': 'FoodFinder-AI/1.0.0'
        }
      });

      this.logger.apiCall(url, 'GET', response.status, Date.now());
      return response.data;
      
    } catch (error) {
      this.logger.error('Failed to get business details', error);
      throw error;
    }
  }
}
