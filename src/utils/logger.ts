import { env } from './env';

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
}

class Logger {
  private level: LogLevel;
  private prefix: string;

  constructor(prefix: string = 'FoodFinder') {
    this.prefix = prefix;
    this.level = this.getLogLevelFromEnv();
  }

  private getLogLevelFromEnv(): LogLevel {
    switch (env.LOG_LEVEL) {
      case 'debug':
        return LogLevel.DEBUG;
      case 'info':
        return LogLevel.INFO;
      case 'warn':
        return LogLevel.WARN;
      case 'error':
        return LogLevel.ERROR;
      default:
        return LogLevel.INFO;
    }
  }

  private formatMessage(level: string, message: string, data?: any): string {
    const timestamp = new Date().toISOString();
    const prefix = `[${timestamp}] [${level}] [${this.prefix}]`;
    
    if (data) {
      return `${prefix} ${message} ${JSON.stringify(data, null, 2)}`;
    }
    
    return `${prefix} ${message}`;
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.level;
  }

  debug(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.DEBUG)) {
      console.debug(this.formatMessage('DEBUG', message, data));
    }
  }

  info(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.INFO)) {
      console.info(this.formatMessage('INFO', message, data));
    }
  }

  warn(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.WARN)) {
      console.warn(this.formatMessage('WARN', message, data));
    }
  }

  error(message: string, data?: any): void {
    if (this.shouldLog(LogLevel.ERROR)) {
      console.error(this.formatMessage('ERROR', message, data));
    }
  }

  // Specialized logging methods
  apiCall(endpoint: string, method: string, statusCode: number, responseTime: number): void {
    this.info(`API Call: ${method} ${endpoint}`, {
      statusCode,
      responseTime: `${responseTime}ms`,
    });
  }

  searchQuery(query: string, location: string, results: number): void {
    this.info(`Search Query: "${query}" in ${location}`, {
      results,
      timestamp: new Date().toISOString(),
    });
  }

  agentAction(action: string, tool: string, result: any): void {
    this.debug(`Agent Action: ${action} using ${tool}`, {
      result: result instanceof Error ? result.message : result,
    });
  }

  // Performance logging
  performance(operation: string, duration: number, metadata?: any): void {
    this.info(`Performance: ${operation} completed in ${duration}ms`, metadata);
  }

  // Error logging with stack traces
  errorWithStack(message: string, error: Error, context?: any): void {
    this.error(message, {
      error: error.message,
      stack: error.stack,
      context,
    });
  }
}

// Create default logger instance
export const logger = new Logger();

// Create logger factory for different components
export function createLogger(prefix: string): Logger {
  return new Logger(prefix);
}

// Export the Logger class for custom instances
export { Logger };
