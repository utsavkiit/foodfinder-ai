// Export all search tools
export { GoogleSearchTool } from './google-search';
export { YelpSearchTool } from './yelp-search';

// Tool factory and management
import { GoogleSearchTool } from './google-search';
import { YelpSearchTool } from './yelp-search';
import { logger } from '../utils/logger';
import { 
  RestaurantSearchParams, 
  RestaurantSearchResult, 
  DataSource,
  Restaurant,
  RestaurantRanking,
  RankingFactor,
  PriceRange
} from '../types';

export interface SearchTool {
  searchRestaurants(params: RestaurantSearchParams): Promise<RestaurantSearchResult>;
  testConnection(): Promise<boolean>;
}

export class ToolManager {
  private tools: Map<string, SearchTool> = new Map();
  private logger = logger;

  constructor() {
    this.initializeTools();
  }

  /**
   * Initialize all available search tools
   */
  private initializeTools(): void {
    try {
      // Initialize Google Search Tool
      const googleTool = new GoogleSearchTool();
      this.tools.set('google', googleTool);
      this.logger.info('Google Search Tool initialized successfully');

      // Initialize Yelp Search Tool
      const yelpTool = new YelpSearchTool();
      this.tools.set('yelp', yelpTool);
      this.logger.info('Yelp Search Tool initialized successfully');

    } catch (error) {
      this.logger.error('Failed to initialize search tools', error);
    }
  }

  /**
   * Get a specific search tool by name
   */
  getTool(name: string): SearchTool | undefined {
    return this.tools.get(name);
  }

  /**
   * Get all available tool names
   */
  getAvailableTools(): string[] {
    return Array.from(this.tools.keys());
  }

  /**
   * Test connection for all tools
   */
  async testAllConnections(): Promise<{ [key: string]: boolean }> {
    const results: { [key: string]: boolean } = {};
    
    for (const [name, tool] of this.tools) {
      try {
        results[name] = await tool.testConnection();
        this.logger.info(`Tool ${name} connection test: ${results[name] ? 'SUCCESS' : 'FAILED'}`);
      } catch (error) {
        results[name] = false;
        this.logger.error(`Tool ${name} connection test failed`, error);
      }
    }

    return results;
  }

  /**
   * Search restaurants using a specific tool
   */
  async searchWithTool(toolName: string, params: RestaurantSearchParams): Promise<RestaurantSearchResult> {
    const tool = this.tools.get(toolName);
    if (!tool) {
      throw new Error(`Tool '${toolName}' not found. Available tools: ${this.getAvailableTools().join(', ')}`);
    }

    return await tool.searchRestaurants(params);
  }

  /**
   * Search restaurants using multiple tools and combine results
   */
  async searchWithMultipleTools(
    toolNames: string[], 
    params: RestaurantSearchParams
  ): Promise<RestaurantSearchResult> {
    const allResults: RestaurantSearchResult[] = [];
    const startTime = Date.now();

    // Search with each tool
    for (const toolName of toolNames) {
      try {
        const result = await this.searchWithTool(toolName, params);
        allResults.push(result);
        this.logger.info(`Tool ${toolName} returned ${result.restaurants.length} results`);
      } catch (error) {
        this.logger.error(`Tool ${toolName} search failed`, error);
        // Continue with other tools
      }
    }

    // Combine and deduplicate results
    const combinedRestaurants = this.combineAndDeduplicateResults(allResults);
    
    const searchTime = Date.now() - startTime;
    
    return {
      restaurants: combinedRestaurants,
      totalResults: combinedRestaurants.length,
      searchParams: params,
      searchTime
    };
  }

  /**
   * Combine results from multiple tools and remove duplicates
   */
  private combineAndDeduplicateResults(results: RestaurantSearchResult[]): Restaurant[] {
    const restaurantMap = new Map<string, Restaurant>();
    
    for (const result of results) {
      for (const restaurant of result.restaurants) {
        // Use restaurant name and address as key for deduplication
        const key = `${restaurant.name.toLowerCase()}_${restaurant.address.toLowerCase()}`;
        
        if (!restaurantMap.has(key)) {
          restaurantMap.set(key, restaurant);
        } else {
          // If duplicate found, prefer the one with more information
          const existing = restaurantMap.get(key)!;
          if (this.getRestaurantInfoScore(restaurant) > this.getRestaurantInfoScore(existing)) {
            restaurantMap.set(key, restaurant);
          }
        }
      }
    }

    return Array.from(restaurantMap.values());
  }

  /**
   * Score restaurant based on information completeness
   */
  private getRestaurantInfoScore(restaurant: Restaurant): number {
    let score = 0;
    
    if (restaurant.phone) score += 1;
    if (restaurant.website) score += 1;
    if (restaurant.coordinates) score += 1;
    if (restaurant.hours) score += 1;
    if (restaurant.features && restaurant.features.length > 0) score += 1;
    if (restaurant.images && restaurant.images.length > 0) score += 1;
    
    return score;
  }

  /**
   * Rank restaurants based on multiple criteria
   */
  rankRestaurants(restaurants: Restaurant[], criteria: RankingCriteria = {}): RestaurantRanking[] {
    const rankings: RestaurantRanking[] = [];

    for (const restaurant of restaurants) {
      const ranking = this.calculateRestaurantRanking(restaurant, criteria);
      rankings.push(ranking);
    }

    // Sort by score (highest first)
    return rankings.sort((a, b) => b.score - a.score);
  }

  /**
   * Calculate ranking for a single restaurant
   */
  private calculateRestaurantRanking(restaurant: Restaurant, criteria: RankingCriteria): RestaurantRanking {
    const factors: RankingFactor[] = [];
    let totalScore = 0;

    // Rating factor (weight: 0.3)
    const ratingWeight = 0.3;
    const ratingScore = restaurant.rating / 5; // Normalize to 0-1
    factors.push({
      name: 'Rating',
      weight: ratingWeight,
      score: ratingScore,
      description: `Rating: ${restaurant.rating}/5`
    });
    totalScore += ratingScore * ratingWeight;

    // Review count factor (weight: 0.2)
    const reviewWeight = 0.2;
    const reviewScore = Math.min(restaurant.reviewCount / 100, 1); // Normalize to 0-1, cap at 100 reviews
    factors.push({
      name: 'Review Count',
      weight: reviewWeight,
      score: reviewScore,
      description: `${restaurant.reviewCount} reviews`
    });
    totalScore += reviewScore * reviewWeight;

    // Price factor (weight: 0.15)
    const priceWeight = 0.15;
    let priceScore = 0;
    switch (restaurant.priceRange) {
      case PriceRange.BUDGET: priceScore = 1.0; break;
      case PriceRange.MODERATE: priceScore = 0.8; break;
      case PriceRange.EXPENSIVE: priceScore = 0.6; break;
      case PriceRange.VERY_EXPENSIVE: priceScore = 0.4; break;
      default: priceScore = 0.5;
    }
    factors.push({
      name: 'Price Range',
      weight: priceWeight,
      score: priceScore,
      description: `Price: ${restaurant.priceRange}`
    });
    totalScore += priceScore * priceWeight;

    // Information completeness factor (weight: 0.2)
    const infoWeight = 0.2;
    const infoScore = this.getRestaurantInfoScore(restaurant) / 6; // Normalize to 0-1
    factors.push({
      name: 'Information Completeness',
      weight: infoWeight,
      score: infoScore,
      description: 'Data quality score'
    });
    totalScore += infoScore * infoWeight;

    // Source reliability factor (weight: 0.15)
    const sourceWeight = 0.15;
    const sourceScore = restaurant.source === DataSource.YELP ? 1.0 : 0.8; // Yelp typically has more reliable data
    factors.push({
      name: 'Data Source',
      weight: sourceWeight,
      score: sourceScore,
      description: `Source: ${restaurant.source}`
    });
    totalScore += sourceScore * sourceWeight;

    return {
      restaurant,
      score: totalScore,
      factors
    };
  }
}

export interface RankingCriteria {
  minRating?: number;
  maxPrice?: string;
  preferredCuisines?: string[];
  mustHaveFeatures?: string[];
}

// Create and export default tool manager instance
export const toolManager = new ToolManager();
