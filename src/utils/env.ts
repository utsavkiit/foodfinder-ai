import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

// Environment variable schema for validation
const envSchema = z.object({
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  
  // Google Custom Search Configuration
  PERPLEXITY_API_KEY: z.string().min(1, 'Perplexity API key is required'),

  
  // Yelp Configuration
  // YELP_API_KEY: z.string().min(1, 'Yelp API key is required'), // Commented out Yelp for now
  
  // Optional Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Parse and validate environment variables with fallbacks
export let env: any;
try {
  env = envSchema.parse(process.env);
} catch (error) {
  // If validation fails, use defaults and log warnings
  console.warn('⚠️  Environment validation failed. Using default values.');
  console.warn('💡 Please create a .env file with your API keys for full functionality.');
  
  env = {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY || 'missing',
    PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY || 'missing',

    // YELP_API_KEY: process.env.YELP_API_KEY || 'missing', // Commented out Yelp for now
    NODE_ENV: process.env.NODE_ENV || 'development',
    LOG_LEVEL: process.env.LOG_LEVEL || 'info'
  };
}

// Environment helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// API configuration objects
export const openaiConfig = {
  apiKey: env.OPENAI_API_KEY,
};

export const perplexityConfig = {
  apiKey: env.PERPLEXITY_API_KEY,

};

// export const yelpConfig = { // Commented out Yelp for now
//   apiKey: env.YELP_API_KEY,
// };

// Validation function to check if all required APIs are configured
export function validateApiConfiguration(): boolean {
  try {
    const result = envSchema.safeParse(process.env);
    return result.success;
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    return false;
  }
}

// Helper to get missing environment variables
export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  const required = ['OPENAI_API_KEY', 'PERPLEXITY_API_KEY']; // Removed YELP_API_KEY for now
  
  for (const key of required) {
    if (!process.env[key] || process.env[key] === 'missing') {
      missing.push(key);
    }
  }
  
  return missing;
}

// Check if specific API is available
export function isOpenAIAvailable(): boolean {
  return env.OPENAI_API_KEY !== 'missing';
}

export function isPerplexityAvailable(): boolean {
  return env.PERPLEXITY_API_KEY !== 'missing';
}

// export function isYelpAvailable(): boolean { // Commented out Yelp for now
//   return env.YELP_API_KEY !== 'missing';
// }
