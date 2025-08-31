import { RestaurantRanking } from './restaurant';

// LangChain agent types
export interface AgentConfig {
  name: string;
  description: string;
  tools: string[];
  model: string;
  temperature: number;
  maxTokens: number;
  systemPrompt: string;
}

export interface AgentTool {
  name: string;
  description: string;
  schema: any;
  execute: (args: any) => Promise<any>;
}

export interface AgentMemory {
  type: 'buffer' | 'conversation' | 'vector';
  maxTokens: number;
  returnMessages: boolean;
}

export interface AgentResponse {
  content: string;
  toolCalls?: AgentToolCall[];
  metadata: {
    model: string;
    usage: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
    finishReason: string;
  };
}

export interface AgentToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string;
  };
}

// Restaurant recommendation agent types
export interface RecommendationRequest {
  userPreferences: UserPreferences;
  searchContext: SearchContext;
  constraints: RecommendationConstraints;
}

export interface UserPreferences {
  cuisine: string[];
  priceRange: string[];
  dietaryRestrictions: string[];
  preferredFeatures: string[];
  ratingThreshold: number;
  maxDistance: number;
}

export interface SearchContext {
  location: string;
  occasion: string;
  groupSize: number;
  timeOfDay: string;
  urgency: 'low' | 'medium' | 'high';
}

export interface RecommendationConstraints {
  maxResults: number;
  mustBeOpen: boolean;
  includeDelivery: boolean;
  includeTakeout: boolean;
  excludeChains: boolean;
}

export interface RecommendationResult {
  recommendations: RestaurantRanking[];
  reasoning: string;
  confidence: number;
  alternatives: RestaurantRanking[];
  nextSteps: string[];
}

// Agent conversation types
export interface ConversationTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
  metadata?: {
    toolCalls?: AgentToolCall[];
    toolResults?: any[];
    confidence?: number;
    recommendations?: string[];
  };
}

export interface Conversation {
  id: string;
  turns: ConversationTurn[];
  context: {
    userPreferences: UserPreferences;
    searchHistory: string[];
    currentLocation?: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

// Agent evaluation types
export interface AgentEvaluation {
  accuracy: number;
  relevance: number;
  helpfulness: number;
  responseTime: number;
  userSatisfaction: number;
  feedback: string;
  timestamp: Date;
}
