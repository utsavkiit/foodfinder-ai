import { ChatOpenAI } from '@langchain/openai';
import { toolManager } from '../tools';
import { logger } from '../utils/logger';

export class RestaurantRecommendationAgent {
  private model: ChatOpenAI;
  private logger = logger;

  constructor() {
    // Initialize OpenAI model
    this.model = new ChatOpenAI({
      modelName: 'gpt-4o-mini',
      temperature: 0.7,
      maxTokens: 1000,
      openAIApiKey: process.env.OPENAI_API_KEY,
    });

    this.logger.info('Restaurant Recommendation Agent initialized');
  }

  /**
   * Get restaurant recommendations based on user input
   */
  async getRecommendations(
    userInput: string,
    maxResults: number = 5
  ): Promise<any> {
    const startTime = Date.now();
    
    try {
      this.logger.info(`Processing recommendation request: "${userInput}"`);

      // Parse user input and extract preferences
      const { preferences, context, constraints } = await this.parseUserInput(userInput);
      
      // Search for restaurants using available tools
      const searchParams = this.buildSearchParams(preferences, context, constraints);
      const searchResult = await toolManager.searchWithMultipleTools(
        toolManager.getAvailableTools(),
        searchParams
      );

      // Rank the results
      const rankings = toolManager.rankRestaurants(searchResult.restaurants);
      
      // Get top recommendations
      const topRankings = rankings.slice(0, maxResults);
      
      // Generate AI-powered reasoning
      const reasoning = await this.generateReasoning(userInput, preferences, topRankings);
      
      // Generate next steps
      const nextSteps = this.generateNextSteps(preferences, topRankings);
      
      const processingTime = Date.now() - startTime;
      
      this.logger.info(`Recommendations generated in ${processingTime}ms`, {
        input: userInput,
        results: topRankings.length,
        processingTime
      });

      return {
        recommendations: topRankings,
        reasoning,
        confidence: this.calculateConfidence(topRankings, preferences),
        alternatives: rankings.slice(maxResults, maxResults + 3),
        nextSteps
      };

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.logger.errorWithStack('Failed to generate recommendations', error as Error, {
        input: userInput,
        processingTime
      });
      
      throw new Error(`Failed to generate recommendations: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Parse user input to extract preferences, context, and constraints
   */
  private async parseUserInput(userInput: string): Promise<any> {
    try {
      const prompt = `
You are a restaurant recommendation expert. Analyze this user request and return a JSON response:

User request: ${userInput}

Return JSON with this structure:
{
  "preferences": {
    "cuisine": ["array", "of", "cuisines"],
    "priceRange": ["budget", "moderate", "expensive"],
    "dietaryRestrictions": ["vegetarian", "gluten-free", etc.],
    "preferredFeatures": ["outdoor seating", "delivery", etc.],
    "ratingThreshold": 4.0,
    "maxDistance": 10
  },
  "context": {
    "location": "city, state",
    "occasion": "dinner, lunch, date, etc.",
    "groupSize": 2,
    "timeOfDay": "evening, afternoon, etc.",
    "urgency": "low, medium, high"
  },
  "constraints": {
    "maxResults": 5,
    "mustBeOpen": true,
    "includeDelivery": false,
    "includeTakeout": true,
    "excludeChains": false
  }
}

Only return valid JSON. If information is missing, use reasonable defaults.
`;

      const response = await this.model.invoke(prompt);
      const responseText = response.content as string;
      
      // Try to extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        
        return {
          preferences: {
            cuisine: parsed.preferences?.cuisine || ['american'],
            priceRange: parsed.preferences?.priceRange || ['budget', 'moderate'],
            dietaryRestrictions: parsed.preferences?.dietaryRestrictions || [],
            preferredFeatures: parsed.preferences?.preferredFeatures || [],
            ratingThreshold: parsed.preferences?.ratingThreshold || 4.0,
            maxDistance: parsed.preferences?.maxDistance || 10
          },
          context: {
            location: parsed.context?.location || 'San Francisco, CA',
            occasion: parsed.context?.occasion || 'dinner',
            groupSize: parsed.context?.groupSize || 2,
            timeOfDay: parsed.context?.timeOfDay || 'evening',
            urgency: parsed.context?.urgency || 'medium'
          },
          constraints: {
            maxResults: parsed.constraints?.maxResults || 5,
            mustBeOpen: parsed.constraints?.mustBeOpen ?? true,
            includeDelivery: parsed.constraints?.includeDelivery ?? false,
            includeTakeout: parsed.constraints?.includeTakeout ?? true,
            excludeChains: parsed.constraints?.excludeChains ?? false
          }
        };
      }
      
      throw new Error('Failed to extract JSON from AI response');
      
    } catch (error) {
      this.logger.warn('Failed to parse user input with AI, using defaults', error);
      return this.parseUserInputFallback(userInput);
    }
  }

  /**
   * Fallback method for parsing user input when AI parsing fails
   */
  private parseUserInputFallback(userInput: string): any {
    const input = userInput.toLowerCase();
    
    // Extract cuisine preferences
    const cuisines = [];
    if (input.includes('italian')) cuisines.push('italian');
    if (input.includes('chinese')) cuisines.push('chinese');
    if (input.includes('mexican')) cuisines.push('mexican');
    if (input.includes('japanese')) cuisines.push('japanese');
    if (input.includes('indian')) cuisines.push('indian');
    if (input.includes('american')) cuisines.push('american');
    if (input.includes('mediterranean')) cuisines.push('mediterranean');
    if (input.includes('thai')) cuisines.push('thai');
    if (input.includes('french')) cuisines.push('french');
    
    // Extract price preferences
    const priceRange = [];
    if (input.includes('cheap') || input.includes('budget') || input.includes('affordable')) {
      priceRange.push('budget');
    }
    if (input.includes('moderate') || input.includes('casual')) {
      priceRange.push('moderate');
    }
    if (input.includes('expensive') || input.includes('upscale') || input.includes('fine dining')) {
      priceRange.push('expensive');
    }
    if (input.includes('luxury') || input.includes('high end')) {
      priceRange.push('very_expensive');
    }
    
    // Extract location
    let location = 'San Francisco, CA';
    const locationMatch = input.match(/(?:in|at|near|around)\s+([^,]+(?:,\s*[A-Z]{2})?)/i);
    if (locationMatch) {
      location = locationMatch[1];
    }
    
    return {
      preferences: {
        cuisine: cuisines.length > 0 ? cuisines : ['american'],
        priceRange: priceRange.length > 0 ? priceRange : ['budget', 'moderate'],
        dietaryRestrictions: [],
        preferredFeatures: [],
        ratingThreshold: 4.0,
        maxDistance: 10
      },
      context: {
        location,
        occasion: 'dinner',
        groupSize: 2,
        timeOfDay: 'evening',
        urgency: 'medium'
      },
      constraints: {
        maxResults: 5,
        mustBeOpen: true,
        includeDelivery: false,
        includeTakeout: true,
        excludeChains: false
      }
    };
  }

  /**
   * Build search parameters from parsed preferences and context
   */
  private buildSearchParams(preferences: any, context: any, constraints: any): any {
    return {
      query: `${preferences.cuisine.join(' ')} restaurant`,
      location: context.location,
      radius: preferences.maxDistance,
      cuisine: preferences.cuisine,
      priceRange: preferences.priceRange,
      rating: preferences.ratingThreshold,
      openNow: constraints.mustBeOpen,
      maxResults: constraints.maxResults
    };
  }

  /**
   * Generate AI-powered reasoning for recommendations
   */
  private async generateReasoning(
    userInput: string,
    preferences: any,
    recommendations: any[]
  ): Promise<string> {
    const prompt = `
You are a restaurant recommendation expert. Explain why these restaurants are recommended based on the user's preferences.

User request: ${userInput}

User preferences:
- Cuisine: ${preferences.cuisine.join(', ')}
- Price range: ${preferences.priceRange.join(', ')}
- Rating threshold: ${preferences.ratingThreshold}
- Max distance: ${preferences.maxDistance} miles

Top recommendations:
${recommendations.map((r: any, i: number) => 
  `${i + 1}. ${r.restaurant.name} - ${r.restaurant.cuisine.join(', ')} - ${r.restaurant.priceRange} - ${r.restaurant.rating}/5 stars`
).join('\n')}

Please explain why these restaurants are recommended for this user. Be conversational and helpful.
`;

    try {
      const response = await this.model.invoke(prompt);
      return response.content as string;
    } catch (error) {
      this.logger.warn('Failed to generate AI reasoning, using fallback', error);
      return this.generateReasoningFallback(preferences, recommendations);
    }
  }

  /**
   * Fallback method for generating reasoning when AI fails
   */
  private generateReasoningFallback(preferences: any, recommendations: any[]): string {
    let reasoning = `Based on your preferences for ${preferences.cuisine.join(', ')} cuisine and ${preferences.priceRange.join(', ')} price range, here are my top recommendations:\n\n`;
    
    recommendations.forEach((rec: any, i: number) => {
      const restaurant = rec.restaurant;
      reasoning += `${i + 1}. **${restaurant.name}** - This ${restaurant.cuisine.join(', ')} restaurant has a ${restaurant.rating}/5 star rating with ${restaurant.reviewCount} reviews. `;
      reasoning += `It's priced in the ${restaurant.priceRange} range and located in ${restaurant.city}, ${restaurant.state}.\n\n`;
    });
    
    reasoning += `These restaurants were selected based on their high ratings, good review counts, and alignment with your cuisine and price preferences.`;
    
    return reasoning;
  }

  /**
   * Generate next steps and suggestions
   */
  private generateNextSteps(preferences: any, recommendations: any[]): string[] {
    const nextSteps: string[] = [];
    
    // Add cuisine exploration suggestions
    if (preferences.cuisine.length === 1) {
      const cuisine = preferences.cuisine[0];
      const relatedCuisines = this.getRelatedCuisines(cuisine);
      if (relatedCuisines.length > 0) {
        nextSteps.push(`Try exploring ${relatedCuisines.join(', ')} restaurants for variety`);
      }
    }
    
    // Add general suggestions
    nextSteps.push('Check restaurant hours and make reservations if needed');
    nextSteps.push('Read recent reviews for the latest information');
    
    return nextSteps;
  }

  /**
   * Get related cuisines for exploration
   */
  private getRelatedCuisines(cuisine: string): string[] {
    const cuisineRelations: { [key: string]: string[] } = {
      'italian': ['mediterranean', 'french', 'spanish'],
      'chinese': ['japanese', 'korean', 'vietnamese', 'thai'],
      'mexican': ['spanish', 'caribbean', 'latin american'],
      'indian': ['pakistani', 'bangladeshi', 'sri lankan'],
      'american': ['bbq', 'soul food', 'southern'],
      'mediterranean': ['greek', 'lebanese', 'turkish', 'italian'],
      'french': ['italian', 'mediterranean', 'european']
    };
    
    return cuisineRelations[cuisine.toLowerCase()] || [];
  }

  /**
   * Calculate confidence score for recommendations
   */
  private calculateConfidence(recommendations: any[], preferences: any): number {
    if (recommendations.length === 0) return 0;
    
    let totalScore = 0;
    let maxPossibleScore = 0;
    
    recommendations.forEach((rec: any) => {
      const restaurant = rec.restaurant;
      
      // Cuisine match score
      const cuisineMatch = preferences.cuisine.some((c: string) => 
        restaurant.cuisine.some((rc: string) => rc.toLowerCase().includes(c.toLowerCase()))
      ) ? 1 : 0;
      
      // Price range match score
      const priceMatch = preferences.priceRange.includes(restaurant.priceRange) ? 1 : 0;
      
      // Rating match score
      const ratingMatch = restaurant.rating >= preferences.ratingThreshold ? 1 : 0;
      
      const score = (cuisineMatch + priceMatch + ratingMatch) / 3;
      totalScore += score;
      maxPossibleScore += 1;
    });
    
    return maxPossibleScore > 0 ? totalScore / maxPossibleScore : 0;
  }

  /**
   * Test the agent's OpenAI connection
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await this.model.invoke('Hello, this is a test message.');
      return response !== undefined;
    } catch (error) {
      this.logger.error('OpenAI connection test failed', error);
      return false;
    }
  }
}
