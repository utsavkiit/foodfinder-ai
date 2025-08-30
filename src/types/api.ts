// API response and error types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message: string;
  timestamp: Date;
  requestId?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
  statusCode?: number;
}

export interface ApiRequest {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE';
  url: string;
  headers?: Record<string, string>;
  params?: Record<string, any>;
  body?: any;
  timeout?: number;
}

export interface ApiConfig {
  baseUrl: string;
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

// Rate limiting and throttling types
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  resetTime: Date;
  retryAfter?: number;
}

export interface ThrottleConfig {
  maxRequests: number;
  timeWindow: number; // in milliseconds
  retryAfter: number; // in milliseconds
}

// API provider specific types
export interface ApiProvider {
  name: string;
  baseUrl: string;
  apiKey: string;
  rateLimit: RateLimitInfo;
  isAvailable: boolean;
}

export interface ApiProviderStatus {
  provider: string;
  status: 'available' | 'rate_limited' | 'error' | 'unavailable';
  lastCheck: Date;
  errorCount: number;
  successCount: number;
}

// Request/Response logging types
export interface ApiLogEntry {
  timestamp: Date;
  provider: string;
  endpoint: string;
  method: string;
  statusCode: number;
  responseTime: number; // in milliseconds
  success: boolean;
  error?: string;
  requestId?: string;
}

// API health check types
export interface HealthCheckResult {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  lastCheck: Date;
  error?: string;
}

export interface SystemHealth {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  providers: HealthCheckResult[];
  timestamp: Date;
}
