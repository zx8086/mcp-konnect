/**
 * MCP-Compliant Logging Utility
 * Implements standardized logging per MCP Specification 2025-06-18
 * 
 * Features:
 * - RFC 5424 log levels
 * - MCP notifications/message protocol compliance
 * - Security-aware (no credentials/PII)
 * - Rate limiting protection
 * - Contextual data support
 * - Client log level control
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";

export type LogLevel = 'debug' | 'info' | 'notice' | 'warning' | 'error' | 'critical' | 'alert' | 'emergency';

export interface LogContext {
  sessionId?: string;
  connectionId?: string;
  clientName?: string;
  operationId?: string;
  toolName?: string;
  [key: string]: any;
}

export interface LogMessage {
  level: LogLevel;
  logger: string;
  message: string;
  data?: Record<string, any>;
  timestamp?: string;
}

class MCPLogger {
  private minLevel: LogLevel = 'info';
  private logCount = 0;
  private lastLogTime = 0;
  private rateLimitThreshold = 100; // max logs per second
  private server?: McpServer;
  
  private logLevelOrder: Record<LogLevel, number> = {
    debug: 0,
    info: 1,
    notice: 2,
    warning: 3,
    error: 4,
    critical: 5,
    alert: 6,
    emergency: 7
  };

  /**
   * Initialize the logger with an MCP server instance
   */
  initialize(server: McpServer): void {
    this.server = server;
    
    // Register logging/setLevel handler as per MCP spec
    server.setRequestHandler({ method: "logging/setLevel" }, async (request) => {
      const level = request.params?.level as LogLevel;
      if (level && level in this.logLevelOrder) {
        this.minLevel = level;
        return {};
      }
      throw new Error(`Invalid log level: ${level}`);
    });
  }

  setMinLevel(level: LogLevel): void {
    this.minLevel = level;
  }

  private shouldLog(level: LogLevel): boolean {
    // Check log level
    if (this.logLevelOrder[level] < this.logLevelOrder[this.minLevel]) {
      return false;
    }

    // Rate limiting protection
    const now = Date.now();
    if (now - this.lastLogTime < 1000) {
      this.logCount++;
      if (this.logCount > this.rateLimitThreshold) {
        return false;
      }
    } else {
      this.logCount = 1;
      this.lastLogTime = now;
    }

    return true;
  }

  private sanitizeData(data: any): any {
    if (!data || typeof data !== 'object') {
      return data;
    }

    const sanitized = { ...data };
    
    // Remove sensitive fields
    const sensitiveKeys = [
      'token', 'password', 'secret', 'key', 'auth', 'credential',
      'authorization', 'x-api-key', 'bearer', 'apikey'
    ];

    function sanitizeObject(obj: any): any {
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      if (obj && typeof obj === 'object') {
        const result: any = {};
        for (const [key, value] of Object.entries(obj)) {
          const lowerKey = key.toLowerCase();
          if (sensitiveKeys.some(sensitive => lowerKey.includes(sensitive))) {
            result[key] = '[REDACTED]';
          } else {
            result[key] = sanitizeObject(value);
          }
        }
        return result;
      }
      
      return obj;
    }

    return sanitizeObject(sanitized);
  }

  private log(level: LogLevel, logger: string, message: string, context?: LogContext): void {
    if (!this.shouldLog(level)) {
      return;
    }

    // Prepare log data according to MCP spec
    const logData: Record<string, any> = { message };
    
    if (context && Object.keys(context).length > 0) {
      Object.assign(logData, this.sanitizeData(context));
    }

    // Send via MCP notifications/message if server is available
    if (this.server) {
      try {
        this.server.notification({
          method: "notifications/message",
          params: {
            level,
            logger,
            data: logData
          }
        });
      } catch (error) {
        // Fallback to console.error if MCP notification fails
        console.error(`[MCP LOG FALLBACK] ${level}: ${logger}: ${message}`, context);
      }
    } else {
      // Fallback to console.error for compatibility during initialization
      console.error(`[${level.toUpperCase()}] ${logger}: ${message}`, context ? this.sanitizeData(context) : '');
    }
  }

  // Log level methods
  debug(logger: string, message: string, context?: LogContext): void {
    this.log('debug', logger, message, context);
  }

  info(logger: string, message: string, context?: LogContext): void {
    this.log('info', logger, message, context);
  }

  notice(logger: string, message: string, context?: LogContext): void {
    this.log('notice', logger, message, context);
  }

  warning(logger: string, message: string, context?: LogContext): void {
    this.log('warning', logger, message, context);
  }

  error(logger: string, message: string, context?: LogContext): void {
    this.log('error', logger, message, context);
  }

  critical(logger: string, message: string, context?: LogContext): void {
    this.log('critical', logger, message, context);
  }

  alert(logger: string, message: string, context?: LogContext): void {
    this.log('alert', logger, message, context);
  }

  emergency(logger: string, message: string, context?: LogContext): void {
    this.log('emergency', logger, message, context);
  }

  // Convenience methods for common scenarios
  startup(logger: string, context?: LogContext): void {
    this.info(logger, 'Server starting', context);
  }

  ready(logger: string, context?: LogContext): void {
    this.notice(logger, 'Server ready', context);
  }

  sessionStart(logger: string, context?: LogContext): void {
    this.info(logger, 'Session started', context);
  }

  sessionEnd(logger: string, context?: LogContext): void {
    this.info(logger, 'Session ended', context);
  }

  toolCall(logger: string, toolName: string, context?: LogContext): void {
    this.debug(logger, 'Tool called', { ...context, toolName });
  }

  operationStart(logger: string, operation: string, context?: LogContext): void {
    this.debug(logger, 'Operation started', { ...context, operation });
  }

  operationEnd(logger: string, operation: string, duration: number, context?: LogContext): void {
    this.debug(logger, 'Operation completed', { ...context, operation, duration });
  }

  configLoaded(logger: string, config: Record<string, any>): void {
    this.info(logger, 'Configuration loaded', this.sanitizeData(config));
  }

  healthCheck(logger: string, status: 'healthy' | 'degraded' | 'unhealthy', details?: Record<string, any>): void {
    const level = status === 'healthy' ? 'info' : status === 'degraded' ? 'warning' : 'error';
    this.log(level, logger, `Health status: ${status}`, details);
  }
}

// Export singleton instance
export const mcpLogger = new MCPLogger();

// Legacy compatibility - gradually migrate these
export const logger = {
  debug: (message: string, context?: any) => mcpLogger.debug('legacy', message, context),
  info: (message: string, context?: any) => mcpLogger.info('legacy', message, context),
  warn: (message: string, context?: any) => mcpLogger.warning('legacy', message, context),
  error: (message: string, context?: any) => mcpLogger.error('legacy', message, context),
};