import { ChatPerplexity } from '@langchain/community/chat_models/perplexity';
import { logger } from '../utils/logger';
import { 
  RestaurantSearchParams, 
  RestaurantSearchResult,
  Restaurant,
  DataSource,
  PriceRange,
  FeatureCategory,
  RestaurantFeature
} from '../types';

export class PerplexitySearchTool {
  private model: ChatPerplexity;
  private readonly logger = logger;

  constructor() {
    // Initialize Perplexity with Sonar model
    this.model = new ChatPerplexity({
      model: 'sonar',
      apiKey: process.env.PERPLEXITY_API_KEY || 'dummy',
    });

    this.logger.info('Perplexity Sonar Search Tool initialized');
  }

  /**
   * Search for restaurants using Perplexity Sonar Search
   */
  async searchRestaurants(params: RestaurantSearchParams): Promise<RestaurantSearchResult> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Searching for restaurants with Perplexity: "${params.query}" in ${params.location}`);

      // Build search prompt
      const searchPrompt = this.buildSearchPrompt(params);
      
      // Execute search
      const response = await this.model.invoke(searchPrompt);
      
      // Parse and transform results
      const responseText = response.content as string;
      const restaurants = this.parseSearchResults(responseText, params);
      
      const searchTime = Date.now() - startTime;
      
      this.logger.info(`Perplexity search completed in ${searchTime}ms`, {
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
      this.logger.errorWithStack('Perplexity search failed', error as Error, {
        query: params.query,
        location: params.location,
        searchTime
      });
      
      throw new Error(`Perplexity search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Build search prompt for Perplexity
   */
  private buildSearchPrompt(params: RestaurantSearchParams): string {
    let prompt = `Find restaurants matching: "${params.query}" in ${params.location}. `;
    
    // Add filters
    if (params.cuisine && params.cuisine.length > 0) {
      prompt += `Focus on ${params.cuisine.join(', ')} cuisine. `;
    }
    
    if (params.priceRange && params.priceRange.length > 0) {
      const priceDescriptions = params.priceRange.map(price => {
        switch (price) {
          case PriceRange.BUDGET: return 'budget-friendly';
          case PriceRange.MODERATE: return 'moderately priced';
          case PriceRange.EXPENSIVE: return 'upscale';
          case PriceRange.VERY_EXPENSIVE: return 'luxury';
          default: return 'any price';
        }
      });
      prompt += `Look for ${priceDescriptions.join(' or ')} restaurants. `;
    }
    
    if (params.rating) {
      prompt += `Only include restaurants with ratings of ${params.rating} stars or higher. `;
    }
    
    prompt += `Return results in this JSON format:
{
  "restaurants": [
    {
      "name": "Restaurant Name",
      "address": "Full address",
      "city": "City",
      "state": "State",
      "phone": "Phone number if available",
      "website": "Website if available",
      "rating": 4.5,
      "reviewCount": 150,
      "priceRange": "moderate",
      "cuisine": ["italian", "mediterranean"],
      "features": ["outdoor seating", "reservations"]
    }
  ]
}

Make sure to return valid JSON. If any information is missing, use reasonable defaults.`;
    
    return prompt;
  }

  /**
   * Parse Perplexity search results into Restaurant objects
   */
  private parseSearchResults(response: string, searchParams: RestaurantSearchParams): Restaurant[] {
    try {
      // Try to extract JSON from the response
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        this.logger.warn('No JSON found in Perplexity response');
        return [];
      }

      const parsed = JSON.parse(jsonMatch[0]);
      
      if (!parsed.restaurants || !Array.isArray(parsed.restaurants)) {
        this.logger.warn('Invalid restaurant data structure in Perplexity response');
        return [];
      }

      const restaurants: Restaurant[] = [];
      
      for (const result of parsed.restaurants) {
        try {
          const restaurant = this.parseRestaurant(result, searchParams);
          if (restaurant) {
            restaurants.push(restaurant);
          }
        } catch (error) {
          this.logger.warn('Failed to parse restaurant result', {
            result,
            error: error instanceof Error ? error.message : 'Unknown error'
          });
        }
      }

      this.logger.debug(`Parsed ${restaurants.length} restaurants from Perplexity results`);
      return restaurants;

    } catch (error) {
      this.logger.error('Failed to parse Perplexity search results', error);
      return [];
    }
  }

  /**
   * Parse individual restaurant result into Restaurant object
   */
  private parseRestaurant(result: any, searchParams: RestaurantSearchParams): Restaurant | null {
    try {
      return {
        id: this.generateRestaurantId(result.name, result.address),
        name: result.name || 'Unknown Restaurant',
        address: result.address || 'Address not available',
        city: result.city || '',
        state: result.state || '',
        zipCode: result.zipCode || '',
        phone: result.phone || undefined,
        website: result.website || undefined,
        rating: result.rating || 4.0,
        reviewCount: result.reviewCount || 50,
        priceRange: this.mapPriceRange(result.priceRange),
        cuisine: Array.isArray(result.cuisine) ? result.cuisine : ['american'],
        coordinates: undefined, // Perplexity doesn't provide coordinates
        hours: result.hours || undefined,
        features: this.parseFeatures(result.features),
        source: DataSource.PERPLEXITY,
        sourceId: result.name,
        lastUpdated: new Date()
      };
    } catch (error) {
      this.logger.error('Failed to parse restaurant', { result, error });
      return null;
    }
  }

  /**
   * Map price range string to enum
   */
  private mapPriceRange(priceStr: string): PriceRange {
    if (!priceStr) return PriceRange.MODERATE;
    
    const lower = priceStr.toLowerCase();
    if (lower.includes('budget') || lower.includes('cheap')) return PriceRange.BUDGET;
    if (lower.includes('moderate') || lower.includes('casual')) return PriceRange.MODERATE;
    if (lower.includes('upscale') || lower.includes('expensive')) return PriceRange.EXPENSIVE;
    if (lower.includes('luxury') || lower.includes('high-end')) return PriceRange.VERY_EXPENSIVE;
    
    return PriceRange.MODERATE;
  }

  /**
   * Parse features array
   */
  private parseFeatures(features: any): RestaurantFeature[] {
    if (!Array.isArray(features)) return [];
    
    return features.map(feature => {
      if (typeof feature === 'string') {
        return { name: feature, value: true, category: FeatureCategory.OTHER };
      }
      return feature;
    });
  }

  /**
   * Generate unique restaurant ID
   */
  private generateRestaurantId(name: string, address: string): string {
    const nameHash = Buffer.from(name).toString('base64').substring(0, 8);
    const addressHash = Buffer.from(address).toString('base64').substring(0, 8);
    return `perplexity_${nameHash}_${addressHash}`;
  }

  /**
   * Test connection to Perplexity API
   */
  async testConnection(): Promise<boolean> {
    try {
      if (!process.env.PERPLEXITY_API_KEY) {
        this.logger.warn('PERPLEXITY_API_KEY not set');
        return false;
      }

      // Test with a simple query
      const response = await this.model.invoke('Say "hello"');
      return response !== undefined;
    } catch (error) {
      this.logger.error('Perplexity API connection test failed', error);
      return false;
    }
  }
}
