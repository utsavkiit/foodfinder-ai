// FoodFinder AI - Main Entry Point
export * from './types';
export * from './utils';
export * from './tools';
export * from './agents';

// Import key components directly
import { validateApiConfiguration } from './utils/env';
import { createLogger } from './utils/logger';
import { toolManager } from './tools';
import { RestaurantRecommendationAgent } from './agents';
// Using any types to avoid import issues for now

// Main application class
export class FoodFinderAI {
  private logger = createLogger('FoodFinderAI');
  private recommendationAgent: RestaurantRecommendationAgent;

  constructor() {
    this.logger.info('FoodFinder AI initialized');
    this.recommendationAgent = new RestaurantRecommendationAgent();
  }

  // Initialize the application
  async initialize(): Promise<boolean> {
    try {
      // Validate environment configuration
      if (!validateApiConfiguration()) {
        this.logger.error('Failed to validate API configuration');
        return false;
      }

      // Test tool connections
      this.logger.info('Testing search tool connections...');
      const connectionResults = await toolManager.testAllConnections();
      
      const successfulTools = Object.entries(connectionResults)
        .filter(([_, success]) => success)
        .map(([name, _]) => name);

      if (successfulTools.length === 0) {
        this.logger.error('No search tools are available');
        return false;
      }

      // Test AI agent connection
      this.logger.info('Testing AI agent connection...');
      const agentConnection = await this.recommendationAgent.testConnection();
      
      if (!agentConnection) {
        this.logger.error('AI agent connection failed');
        return false;
      }

      this.logger.info(`Successfully initialized ${successfulTools.length} search tools: ${successfulTools.join(', ')}`);
      this.logger.info('AI agent connection successful');
      this.logger.info('FoodFinder AI initialization completed successfully');
      return true;

    } catch (error) {
      this.logger.errorWithStack('Failed to initialize FoodFinder AI', error as Error);
      return false;
    }
  }

  // Get system health
  getHealth(): { status: string; timestamp: Date; tools: string[]; aiAgent: boolean } {
    return {
      status: 'healthy',
      timestamp: new Date(),
      tools: toolManager.getAvailableTools(),
      aiAgent: true
    };
  }

  // Search for restaurants using available tools
  async searchRestaurants(params: any): Promise<any> {
    this.logger.info(`Searching for restaurants: "${params.query}" in ${params.location}`);
    
    try {
      // Use all available tools for comprehensive results
      const availableTools = toolManager.getAvailableTools();
      const result = await toolManager.searchWithMultipleTools(availableTools, params);
      
      this.logger.info(`Search completed successfully with ${result.totalResults} results`);
      return result;
      
    } catch (error) {
      this.logger.errorWithStack('Restaurant search failed', error as Error);
      throw error;
    }
  }

  // Search with a specific tool
  async searchWithTool(toolName: string, params: any): Promise<any> {
    this.logger.info(`Searching with ${toolName} tool: "${params.query}" in ${params.location}`);
    
    try {
      const result = await toolManager.searchWithTool(toolName, params);
      this.logger.info(`${toolName} search completed with ${result.totalResults} results`);
      return result;
      
    } catch (error) {
      this.logger.errorWithStack(`${toolName} search failed`, error as Error);
      throw error;
    }
  }

  // Get restaurant recommendations with ranking
  async getRecommendations(params: any, maxResults: number = 10): Promise<any[]> {
    this.logger.info(`Getting recommendations for: "${params.query}" in ${params.location}`);
    
    try {
      // Search for restaurants
      const searchResult = await this.searchRestaurants(params);
      
      // Rank the results
      const rankings = toolManager.rankRestaurants(searchResult.restaurants);
      
      // Return top results
      const topRankings = rankings.slice(0, maxResults);
      
      this.logger.info(`Generated ${topRankings.length} recommendations`);
      return topRankings;
      
    } catch (error) {
      this.logger.errorWithStack('Failed to get recommendations', error as Error);
      throw error;
    }
  }

  // Get AI-powered restaurant recommendations
  async getAIRecommendations(
    userInput: string,
    conversationId?: string,
    maxResults: number = 5
  ): Promise<any> {
    this.logger.info(`Getting AI recommendations for: "${userInput}"`);
    
    try {
      const result = await this.recommendationAgent.getRecommendations(
        userInput,
        maxResults
      );
      
      this.logger.info(`AI recommendations generated successfully`);
      return result;
      
    } catch (error) {
      this.logger.errorWithStack('Failed to get AI recommendations', error as Error);
      throw error;
    }
  }

  // Get available search tools
  getAvailableTools(): string[] {
    return toolManager.getAvailableTools();
  }

  // Test all tool connections
  async testToolConnections(): Promise<{ [key: string]: boolean }> {
    return await toolManager.testAllConnections();
  }

  // Test AI agent connection
  async testAIAgentConnection(): Promise<boolean> {
    return await this.recommendationAgent.testConnection();
  }

  // Get conversation history (placeholder for future implementation)
  getConversation(conversationId: string): any {
    this.logger.warn('Conversation history not yet implemented');
    return null;
  }
}

// Default export
export default FoodFinderAI;
