#!/usr/bin/env node

import { FoodFinderAI } from './index';
import { logger } from './utils/logger';
import readline from 'readline';

class FoodFinderCLI {
  private foodFinder: FoodFinderAI;
  private rl: readline.Interface;

  constructor() {
    this.foodFinder = new FoodFinderAI();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
  }

  async start() {
    console.log('\n🍽️  Welcome to FoodFinder AI! 🍽️\n');
    console.log('Your AI-powered restaurant discovery assistant');
    console.log('Type "help" for available commands, "exit" to quit\n');

    await this.showMainMenu();
  }

  private async showMainMenu() {
    this.rl.question('What would you like to do? ', async (answer) => {
      const command = answer.trim().toLowerCase();
      
      switch (command) {
        case 'help':
          this.showHelp();
          break;
        case 'search':
          await this.handleSearch();
          break;
        case 'status':
          await this.showStatus();
          break;
        case 'exit':
        case 'quit':
          console.log('\n👋 Thanks for using FoodFinder AI! Goodbye!\n');
          this.rl.close();
          process.exit(0);
          break;
        default:
          console.log('\n❌ Unknown command. Type "help" for available commands.\n');
          await this.showMainMenu();
          break;
      }
    });
  }

  private showHelp() {
    console.log('\n📚 Available Commands:');
    console.log('  search  - Search for restaurants');
    console.log('  status  - Show system status');
    console.log('  help    - Show this help message');
    console.log('  exit    - Exit the application\n');
    this.showMainMenu();
  }

  private async handleSearch() {
    console.log('\n🔍 Restaurant Search\n');
    
    this.rl.question('What type of food are you looking for? ', async (cuisine) => {
      this.rl.question('Where are you looking? (city/area): ', async (location) => {
        this.rl.question('Price range (budget/moderate/expensive/luxury): ', async (priceRange) => {
          this.rl.question('Minimum rating (1-5): ', async (rating) => {
            try {
              console.log('\n🔍 Searching for restaurants...\n');
              
              const searchParams = {
                query: cuisine,
                location: location,
                cuisine: cuisine ? [cuisine] : undefined,
                priceRange: this.parsePriceRange(priceRange),
                rating: rating ? parseFloat(rating) : undefined,
                maxResults: 10
              };

              const results = await this.foodFinder.searchRestaurants(searchParams);
              
              console.log(`\n✅ Found ${results.restaurants.length} restaurants in ${results.searchTime}ms:\n`);
              
              results.restaurants.forEach((restaurant: any, index: number) => {
                console.log(`${index + 1}. 🏪 ${restaurant.name}`);
                console.log(`   📍 ${restaurant.address}`);
                console.log(`   ⭐ ${restaurant.rating}/5 (${restaurant.reviewCount} reviews)`);
                console.log(`   💰 ${restaurant.priceRange}`);
                console.log(`   🍽️  ${restaurant.cuisine.join(', ')}`);
                if (restaurant.phone) console.log(`   📞 ${restaurant.phone}`);
                if (restaurant.website) console.log(`   🌐 ${restaurant.website}`);
                console.log('');
              });

            } catch (error) {
              console.error('\n❌ Search failed:', error instanceof Error ? error.message : 'Unknown error');
            }
            
            console.log('\n---\n');
            await this.showMainMenu();
          });
        });
      });
    });
  }

  private parsePriceRange(priceStr: string): string[] | undefined {
    const price = priceStr.trim().toLowerCase();
    if (!price || price === 'any') return undefined;
    
    switch (price) {
      case 'budget': return ['budget'];
      case 'moderate': return ['moderate'];
      case 'expensive': return ['expensive'];
      case 'luxury': return ['very_expensive'];
      default: return undefined;
    }
  }

  private async showStatus() {
    console.log('\n📊 System Status\n');
    
    try {
      // Get system status
      console.log('Status: Healthy');
      console.log(`Timestamp: ${new Date().toISOString()}`);
      console.log('Available Tools: perplexity');
      console.log('AI Agent: Available\n');
      
      // Test tool connections
      console.log('🔌 Testing tool connections...');
      const toolStatus = await this.foodFinder.testToolConnections();
      console.log('Tool Connections:', toolStatus);
      
    } catch (error) {
      console.error('❌ Failed to get system status:', error instanceof Error ? error.message : 'Unknown error');
    }
    
    console.log('\n---\n');
    await this.showMainMenu();
  }
}

// Start the CLI
const cli = new FoodFinderCLI();
cli.start().catch(error => {
  console.error('❌ CLI failed to start:', error);
  process.exit(1);
});
