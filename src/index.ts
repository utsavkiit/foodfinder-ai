// FoodFinder AI - Main Entry Point
export * from './types';
export * from './utils';

// Import key components directly
import { validateApiConfiguration } from './utils/env';
import { createLogger } from './utils/logger';

// Main application class
export class FoodFinderAI {
  private logger = createLogger('FoodFinderAI');

  constructor() {
    this.logger.info('FoodFinder AI initialized');
  }

  // Initialize the application
  async initialize(): Promise<boolean> {
    try {
      // Validate environment configuration
      if (!validateApiConfiguration()) {
        this.logger.error('Failed to validate API configuration');
        return false;
      }

      this.logger.info('FoodFinder AI initialization completed successfully');
      return true;
    } catch (error) {
      this.logger.errorWithStack('Failed to initialize FoodFinder AI', error as Error);
      return false;
    }
  }

  // Get system health
  getHealth(): { status: string; timestamp: Date } {
    return {
      status: 'healthy',
      timestamp: new Date(),
    };
  }
}

// Default export
export default FoodFinderAI;
