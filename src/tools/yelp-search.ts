// Yelp Search Tool - Commented out for now
// import axios, { AxiosResponse } from 'axios';
// import { yelpConfig } from '../utils/env';
// import { logger } from '../utils/logger';
// import { 
//   YelpSearchQuery, 
//   YelpSearchResponse, 
//   YelpBusiness,
//   Restaurant,
//   RestaurantSearchParams,
//   RestaurantSearchResult,
//   DataSource,
//   PriceRange,
//   FeatureCategory,
//   RestaurantFeature,
//   Coordinates,
//   BusinessHours,
//   DayHours
// } from '../types';

// export class YelpSearchTool {
//   private readonly baseUrl = 'https://api.yelp.com/v3';
//   private readonly logger = logger;

//   constructor() {
//     this.logger.info('Yelp Search Tool initialized');
//   }

//   /**
//    * Search for restaurants using Yelp Fusion API
//    */
//   async searchRestaurants(params: RestaurantSearchParams): Promise<RestaurantSearchResult> {
//     const startTime = Date.now();
    
//     try {
//       this.logger.info(`Searching for restaurants on Yelp: "${params.query}" in ${params.location}`);

//       // Build Yelp search query
//       const searchQuery = this.buildSearchQuery(params);
      
//       // Execute search
//       const response = await this.executeSearch(searchQuery);
      
//       // Parse and transform results
//       const restaurants = this.parseSearchResults(response, params);
      
//       const searchTime = Date.now() - startTime;
      
//       this.logger.info(`Yelp search completed in ${searchTime}ms`, {
//         query: params.query,
//         location: params.location,
//         results: restaurants.length,
//         searchTime
//       });

//       return {
//         restaurants,
//         totalResults: restaurants.length,
//         searchParams: params,
//         searchTime
//       };

//     } catch (error) {
//       const searchTime = Date.now() - startTime;
//       this.logger.errorWithStack('Yelp search failed', error as Error, {
//         query: params.query,
//         location: params.location,
//         searchTime
//       });
      
//       throw new Error(`Yelp search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
//     }
//   }

//   /**
//    * Build Yelp search query from restaurant search parameters
//    */
//   private buildSearchQuery(params: RestaurantSearchParams): YelpSearchQuery {
//     const query: YelpSearchQuery = {
//       apiKey: yelpConfig.apiKey,
//       term: params.query || 'restaurant',
//       location: params.location,
//       radius: params.radius ? Math.round(params.radius.radius * 1609.34) : undefined, // Convert miles to meters
//       openNow: params.openNow,
//       maxResults: params.maxResults || 20
//     };

//     // Add cuisine categories if specified
//     if (params.cuisine && params.cuisine.length > 0) {
//       query.categories = this.mapCuisineToYelpCategories(params.cuisine);
//     }

//     // Add price filter if specified
//     if (params.priceRange && params.priceRange.length > 0) {
//       query.price = this.mapPriceRangeToYelp(params.priceRange);
//     }

//     // Add rating filter if specified
//     if (params.rating) {
//       // Yelp doesn't support rating filtering in search, but we can filter results after
//       this.logger.debug(`Rating filter ${params.rating} will be applied to results`);
//     }

//     return query;
//   }

//   /**
//    * Execute the Yelp Fusion API request
//    */
//   private async executeSearch(query: YelpSearchQuery): Promise<YelpSearchResponse> {
//     const url = new URL('/businesses/search', this.baseUrl);
    
//     // Add query parameters
//     url.searchParams.set('term', query.term);
//     url.searchParams.set('location', query.location);
    
//     if (query.radius) {
//       url.searchParams.set('radius', query.radius.toString());
//     }
    
//     if (query.openNow !== undefined) {
//       url.searchParams.set('open_now', query.openNow.toString());
//     }
    
//     if (query.maxResults) {
//       url.searchParams.set('limit', query.maxResults.toString());
//     }
    
//     if (query.categories && query.categories.length > 0) {
//       url.searchParams.set('categories', query.categories.join(','));
//     }
    
//     if (query.price && query.price.length > 0) {
//       url.searchParams.set('price', query.price.join(','));
//     }

//     try {
//       const response: AxiosResponse<YelpSearchResponse> = await axios.get(url.toString(), {
//         headers: {
//           'Authorization': `Bearer ${query.apiKey}`,
//           'Content-Type': 'application/json'
//         },
//         timeout: 10000 // 10 second timeout
//       });

//       if (response.status !== 200) {
//         throw new Error(`Yelp API returned status ${response.status}: ${response.statusText}`);
//       }

//       return response.data;

//     } catch (error: any) {
//       if (error.response) {
//         const errorMessage = error.response.data?.error?.description || error.response.statusText;
//         throw new Error(`Yelp API error: ${error.response.status} - ${errorMessage}`);
//       } else if (error.request) {
//         throw new Error('Yelp API request failed - no response received');
//       } else {
//         throw new Error(`Yelp API error: ${error.message}`);
//       }
//     }
//   }

//   /**
//    * Parse Yelp search results into Restaurant objects
//    */
//   private parseSearchResults(response: YelpSearchResponse, searchParams: RestaurantSearchParams): Restaurant[] {
//     if (!response.businesses || response.businesses.length === 0) {
//       this.logger.warn('No search results returned from Yelp API');
//       return [];
//     }

//     const restaurants: Restaurant[] = [];
    
//     for (const business of response.businesses) {
//       try {
//         const restaurant = this.parseBusiness(business, searchParams);
//         if (restaurant) {
//           restaurants.push(restaurant);
//         }
//       } catch (error) {
//         this.logger.warn('Failed to parse Yelp business result', {
//           businessId: business.id,
//           businessName: business.name,
//           error: error instanceof Error ? error.message : 'Unknown error'
//         });
//       }
//     }

//     this.logger.debug(`Parsed ${restaurants.length} restaurants from ${response.businesses.length} Yelp results`);
//     return restaurants;
//   }

//   /**
//    * Parse individual Yelp business into Restaurant object
//    */
//   private parseBusiness(business: YelpBusiness, searchParams: RestaurantSearchParams): Restaurant | null {
//     try {
//       return {
//         id: business.id,
//         name: business.name,
//         address: business.location.address1 || 'Address not available',
//         city: business.location.city || '',
//         state: business.location.state || '',
//         zipCode: business.location.zip_code || '',
//         phone: business.phone || undefined,
//         website: business.url || undefined,
//         rating: business.rating || 0,
//         reviewCount: business.review_count || 0,
//         priceRange: this.mapYelpPriceToPriceRange(business.price),
//         cuisine: this.extractCuisineFromCategories(business.categories),
//         coordinates: this.mapYelpCoordinates(business.coordinates),
//         hours: undefined, // Yelp search doesn't include hours, would need separate API call
//         features: this.extractFeaturesFromCategories(business.categories),
//         source: DataSource.YELP,
//         sourceId: business.id,
//         lastUpdated: new Date()
//       };
//     } catch (error) {
//       this.logger.error('Failed to parse Yelp business', { businessId: business.id, error });
//       return null;
//     }
//   }

//   /**
//    * Map Yelp cuisine categories to our cuisine types
//    */
//   private mapCuisineToYelpCategories(cuisines: string[]): string[] {
//     const yelpCategories: string[] = [];
    
//     for (const cuisine of cuisines) {
//       const lowerCuisine = cuisine.toLowerCase();
      
//       // Map common cuisine types to Yelp categories
//       if (lowerCuisine.includes('italian')) {
//         yelpCategories.push('italian');
//       } else if (lowerCuisine.includes('chinese')) {
//         yelpCategories.push('chinese');
//       } else if (lowerCuisine.includes('japanese')) {
//         yelpCategories.push('japanese');
//       } else if (lowerCuisine.includes('mexican')) {
//         yelpCategories.push('mexican');
//       } else if (lowerCuisine.includes('indian')) {
//         yelpCategories.push('indian');
//       } else if (lowerCuisine.includes('thai')) {
//         yelpCategories.push('thai');
//       } else if (lowerCuisine.includes('french')) {
//         yelpCategories.push('french');
//       } else if (lowerCuisine.includes('mediterranean')) {
//         yelpCategories.push('mediterranean');
//       } else if (lowerCuisine.includes('american')) {
//         yelpCategories.push('newamerican');
//       } else if (lowerCuisine.includes('pizza')) {
//         yelpCategories.push('pizza');
//       } else if (lowerCuisine.includes('burger')) {
//         yelpCategories.push('burgers');
//       } else if (lowerCuisine.includes('seafood')) {
//         yelpCategories.push('seafood');
//       } else if (lowerCuisine.includes('steakhouse')) {
//         yelpCategories.push('steak');
//       } else if (lowerCuisine.includes('sushi')) {
//         yelpCategories.push('sushi');
//       } else if (lowerCuisine.includes('bbq')) {
//         yelpCategories.push('bbq');
//       } else if (lowerCuisine.includes('vegetarian')) {
//         yelpCategories.push('vegetarian');
//       } else if (lowerCuisine.includes('vegan')) {
//         yelpCategories.push('vegan');
//       } else {
//         // Default to restaurants category for unknown cuisines
//         yelpCategories.push('restaurants');
//       }
//     }
    
//     return yelpCategories;
//   }

//   /**
//    * Map Yelp price symbols to our PriceRange enum
//    */
//   private mapYelpPriceToPriceRange(yelpPrice: string): PriceRange {
//     switch (yelpPrice) {
//       case '$':
//         return PriceRange.BUDGET;
//       case '$$':
//         return PriceRange.MODERATE;
//       case '$$$':
//         return PriceRange.EXPENSIVE;
//       case '$$$$':
//         return PriceRange.VERY_EXPENSIVE;
//       default:
//         return PriceRange.MODERATE;
//     }
//   }

//   /**
//    * Map Yelp coordinates to our Coordinates interface
//    */
//   private mapYelpCoordinates(coords: { latitude: number; longitude: number }): Coordinates {
//     return {
//       latitude: coords.latitude,
//       longitude: coords.longitude
//     };
//   }

//   /**
//    * Extract restaurant features from Yelp business data
//    */
//   private extractFeaturesFromCategories(categories: Array<{ alias: string; title: string }>): RestaurantFeature[] {
//     const features: RestaurantFeature[] = [];
    
//     for (const category of categories) {
//       const lowerAlias = category.alias.toLowerCase();
//       const lowerTitle = category.title.toLowerCase();
      
//       // Map Yelp categories to our feature system
//       if (lowerAlias.includes('outdoor') || lowerTitle.includes('outdoor')) {
//         features.push({ category: FeatureCategory.AMBIENCE, name: 'Outdoor Seating' });
//       }
//       if (lowerAlias.includes('delivery') || lowerTitle.includes('delivery')) {
//         features.push({ category: FeatureCategory.SERVICE, name: 'Delivery' });
//       }
//       if (lowerAlias.includes('takeout') || lowerTitle.includes('takeout')) {
//         features.push({ category: FeatureCategory.SERVICE, name: 'Takeout' });
//       }
//       if (lowerAlias.includes('reservation') || lowerTitle.includes('reservation')) {
//         types.push({ category: FeatureCategory.SERVICE, name: 'Reservations' });
//       }
//       if (lowerAlias.includes('wheelchair') || lowerTitle.includes('wheelchair')) {
//         features.push({ category: FeatureCategory.ACCESSIBILITY, name: 'Wheelchair Accessible' });
//       }
//       if (lowerAlias.includes('parking') || lowerTitle.includes('parking')) {
//         features.push({ category: FeatureCategory.AMBIENCE, name: 'Parking Available' });
//       }
//     }
    
//     return features;
//   }

//   /**
//    * Extract cuisine type from Yelp categories
//    */
//   private extractCuisineFromCategories(categories: Array<{ alias: string; title: string }>): string[] {
//     const cuisines: string[] = [];
    
//     for (const category of categories) {
//       const lowerAlias = category.alias.toLowerCase();
//       const lowerTitle = category.title.toLowerCase();
      
//       // Map Yelp categories to cuisine types
//       if (lowerAlias.includes('italian') || lowerTitle.includes('italian')) {
//         cuisines.push('Italian');
//       } else if (lowerAlias.includes('chinese') || lowerTitle.includes('chinese')) {
//         cuisines.push('Chinese');
//       } else if (lowerAlias.includes('japanese') || lowerTitle.includes('japanese')) {
//       } else if (lowerAlias.includes('mexican') || lowerTitle.includes('mexican')) {
//         cuisines.push('Mexican');
//       } else if (lowerAlias.includes('indian') || lowerTitle.includes('indian')) {
//         cuisines.push('Indian');
//       } else if (lowerAlias.includes('thai') || lowerTitle.includes('thai')) {
//         cuisines.push('Thai');
//       } else if (lowerAlias.includes('french') || lowerTitle.includes('french')) {
//         cuisines.push('French');
//       } else if (lowerAlias.includes('mediterranean') || lowerTitle.includes('mediterranean')) {
//         cuisines.push('Mediterranean');
//       } else if (lowerAlias.includes('american') || lowerTitle.includes('american')) {
//         cuisines.push('American');
//       } else if (lowerAlias.includes('pizza') || lowerTitle.includes('pizza')) {
//         cuisines.push('Pizza');
//       } else if (lowerAlias.includes('burger') || lowerTitle.includes('burger')) {
//         cuisines.push('Burgers');
//       } else if (lowerAlias.includes('seafood') || lowerTitle.includes('seafood')) {
//         cuisines.push('Seafood');
//       } else if (lowerAlias.includes('steakhouse') || lowerTitle.includes('steakhouse')) {
//         cuirines.push('Steakhouse');
//       } else if (lowerAlias.includes('sushi') || lowerTitle.includes('sushi')) {
//         cuisines.push('Sushi');
//       } else if (lowerAlias.includes('bbq') || lowerTitle.includes('bbq')) {
//         cuisines.push('BBQ');
//       } else if (lowerAlias.includes('vegetarian') || lowerTitle.includes('vegetarian')) {
//         cuisines.push('Vegetarian');
//       } else if (lowerAlias.includes('vegan') || lowerTitle.includes('vegan')) {
//         cuisines.push('Vegan');
//       }
//     }
    
//     return cuisines;
//   }

//   /**
//    * Test connection to Yelp API
//    */
//   async testConnection(): Promise<boolean> {
//     try {
//       // Try a simple search to test the API
//       const testParams: RestaurantSearchParams = {
//         query: 'restaurant',
//         location: 'San Francisco, CA',
//         maxResults: 1
//       };
      
//       await this.searchRestaurants(testParams);
//       return true;
//     } catch (error) {
//       this.logger.error('Yelp API connection test failed', error);
//       return false;
//     }
//   }
// }
