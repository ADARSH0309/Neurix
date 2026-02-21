/**
 * Structured Logger for Gmail MCP Server
 *
 * Provides JSON-formatted logging with log levels and context
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  service: string;
  [key: string]: unknown;
}

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

class Logger {
  private level: LogLevel;
  private service: string;
  private defaultContext: LogContext;

  constructor(options: {
    level?: LogLevel;
    service?: string;
    defaultContext?: LogContext;
  } = {}) {
    this.level = options.level || (process.env.LOG_LEVEL as LogLevel) || 'info';
    this.service = options.service || 'gmail-mcp-server';
    this.defaultContext = options.defaultContext || {};
  }

  private shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= LOG_LEVELS[this.level];
  }

  private formatEntry(level: LogLevel, message: string, context?: LogContext): LogEntry {
    return {
      timestamp: new Date().toISOString(),
      level,
      message,
      service: this.service,
      environment: process.env.NODE_ENV || 'development',
      ...this.defaultContext,
      ...context,
    };
  }

  private log(level: LogLevel, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) return;

    const entry = this.formatEntry(level, message, context);
    const output = JSON.stringify(entry);

    if (level === 'error') {
      console.error(output);
    } else if (level === 'warn') {
      console.warn(output);
    } else {
      console.log(output);
    }
  }

  debug(message: string, context?: LogContext): void {
    this.log('debug', message, context);
  }

  info(message: string, context?: LogContext): void {
    this.log('info', message, context);
  }

  warn(message: string, context?: LogContext): void {
    this.log('warn', message, context);
  }

  error(message: string, context?: LogContext): void {
    // Enhance error context
    if (context?.error instanceof Error) {
      context = {
        ...context,
        error: {
          name: context.error.name,
          message: context.error.message,
          stack: context.error.stack,
        },
      };
    }
    this.log('error', message, context);
  }

  /**
   * Create a child logger with additional context
   */
  child(context: LogContext): Logger {
    const childLogger = new Logger({
      level: this.level,
      service: this.service,
      defaultContext: { ...this.defaultContext, ...context },
    });
    return childLogger;
  }

  /**
   * Log tool execution with timing
   */
  toolExecution(
    tool: string,
    args: Record<string, unknown>,
    duration: number,
    success: boolean,
    userId?: string
  ): void {
    this.info('Tool executed', {
      tool,
      userId,
      duration,
      success,
      argsSummary: this.summarizeArgs(args),
    });
  }

  /**
   * Summarize arguments for logging (avoid logging sensitive data)
   */
  private summarizeArgs(args: Record<string, unknown>): Record<string, unknown> {
    const summary: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(args)) {
      // Mask sensitive fields
      if (['password', 'token', 'secret', 'apiKey'].some(s => key.toLowerCase().includes(s))) {
        summary[key] = '[REDACTED]';
      } else if (typeof value === 'string' && value.length > 100) {
        summary[key] = `${value.substring(0, 50)}... (${value.length} chars)`;
      } else if (Array.isArray(value)) {
        summary[key] = `[Array of ${value.length} items]`;
      } else {
        summary[key] = value;
      }
    }

    return summary;
  }
}

// Export singleton instance
export const logger = new Logger();

// Export class for creating custom loggers
export { Logger };
