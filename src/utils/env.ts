import { config } from 'dotenv';
import { z } from 'zod';

// Load environment variables from .env file
config();

// Environment variable schema for validation
const envSchema = z.object({
  // OpenAI Configuration
  OPENAI_API_KEY: z.string().min(1, 'OpenAI API key is required'),
  
  // Google Custom Search Configuration
  GOOGLE_API_KEY: z.string().min(1, 'Google API key is required'),
  GOOGLE_CSE_ID: z.string().min(1, 'Google Custom Search Engine ID is required'),
  
  // Yelp Configuration
  YELP_API_KEY: z.string().min(1, 'Yelp API key is required'),
  
  // Optional Configuration
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['debug', 'info', 'warn', 'error']).default('info'),
});

// Parse and validate environment variables
export const env = envSchema.parse(process.env);

// Environment helper functions
export const isDevelopment = env.NODE_ENV === 'development';
export const isProduction = env.NODE_ENV === 'production';
export const isTest = env.NODE_ENV === 'test';

// API configuration objects
export const openaiConfig = {
  apiKey: env.OPENAI_API_KEY,
};

export const googleConfig = {
  apiKey: env.GOOGLE_API_KEY,
  cseId: env.GOOGLE_CSE_ID,
};

export const yelpConfig = {
  apiKey: env.YELP_API_KEY,
};

// Validation function to check if all required APIs are configured
export function validateApiConfiguration(): boolean {
  try {
    envSchema.parse(process.env);
    return true;
  } catch (error) {
    console.error('❌ Environment configuration validation failed:', error);
    return false;
  }
}

// Helper to get missing environment variables
export function getMissingEnvVars(): string[] {
  const missing: string[] = [];
  const required = ['OPENAI_API_KEY', 'GOOGLE_API_KEY', 'GOOGLE_CSE_ID', 'YELP_API_KEY'];
  
  for (const key of required) {
    if (!process.env[key]) {
      missing.push(key);
    }
  }
  
  return missing;
}
