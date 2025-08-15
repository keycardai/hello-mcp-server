import { context, propagation, trace } from "@opentelemetry/api";
import { logger as otelLogger } from "./telemetry";

export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

export interface LogAttributes {
  [key: string]: string | number | boolean | undefined;
}

export interface ErrorLogAttributes extends LogAttributes {
  errorName?: string;
  errorMessage?: string;
  errorStack?: string;
  errorCode?: string;
  errorCause?: string;
}

function extractErrorAttributes(error: Error): ErrorLogAttributes {
  const attributes: ErrorLogAttributes = {
    errorName: error.name,
    errorMessage: error.message,
    errorStack: error.stack,
  };

  if ("code" in error && typeof error.code === "string") {
    attributes.errorCode = error.code;
  }

  if ("cause" in error && error.cause !== undefined) {
    attributes.errorCause =
      error.cause instanceof Error
        ? `${error.cause.name}: ${error.cause.message}`
        : String(error.cause);
  }

  return attributes;
}

export interface IMcpLogger {
  info(message: string, attributes?: LogAttributes): void;
  error(message: string, attributes?: LogAttributes | Error): void;
  warn(message: string, attributes?: LogAttributes): void;
  debug(message: string, attributes?: LogAttributes): void;
  withSessionId(sessionId: string): IMcpLogger;
  withRequestId(requestId: string): IMcpLogger;
  withUserId(userId: string): IMcpLogger;
  withOperation(operation: string): IMcpLogger;
  setLevel(level: LogLevel): void;
  getLevel(): LogLevel;
  isLevelEnabled(level: LogLevel): boolean;
  injectContextIntoHeaders(headers?: Record<string, string>): Record<string, string>;
  getCurrentTraceId(): string | undefined;
  getCurrentSpanId(): string | undefined;
}

export class McpLogger implements IMcpLogger {
  private baseAttributes: LogAttributes;
  private logLevel: LogLevel;

  constructor(baseAttributes: LogAttributes = {}, logLevel?: LogLevel) {
    this.baseAttributes = baseAttributes;
    this.logLevel = logLevel ?? parseLogLevelFromEnv();
  }

  info(message: string, attributes: LogAttributes = {}): void {
    if (this.isLevelEnabled(LogLevel.INFO)) {
      otelLogger.info(message, { ...this.baseAttributes, ...attributes });
    }
  }

  error(message: string, attributes?: LogAttributes | Error): void {
    if (!this.isLevelEnabled(LogLevel.ERROR)) {
      return;
    }

    let allAttributes: LogAttributes = { ...this.baseAttributes };

    if (attributes instanceof Error) {
      allAttributes = { ...allAttributes, ...extractErrorAttributes(attributes) };
    } else if (attributes) {
      allAttributes = { ...allAttributes, ...attributes };
    }

    otelLogger.error(message, allAttributes);
  }

  warn(message: string, attributes: LogAttributes = {}): void {
    if (this.isLevelEnabled(LogLevel.WARN)) {
      otelLogger.warn(message, { ...this.baseAttributes, ...attributes });
    }
  }

  debug(message: string, attributes: LogAttributes = {}): void {
    if (this.isLevelEnabled(LogLevel.DEBUG)) {
      otelLogger.debug(message, { ...this.baseAttributes, ...attributes });
    }
  }

  withSessionId(sessionId: string): IMcpLogger {
    return new McpLogger({ ...this.baseAttributes, sessionId }, this.logLevel);
  }

  withRequestId(requestId: string): IMcpLogger {
    return new McpLogger({ ...this.baseAttributes, requestId }, this.logLevel);
  }

  withUserId(userId: string): IMcpLogger {
    return new McpLogger({ ...this.baseAttributes, userId }, this.logLevel);
  }

  withOperation(operation: string): IMcpLogger {
    return new McpLogger({ ...this.baseAttributes, operation }, this.logLevel);
  }

  setLevel(level: LogLevel): void {
    this.logLevel = level;
  }

  getLevel(): LogLevel {
    return this.logLevel;
  }

  isLevelEnabled(level: LogLevel): boolean {
    return level >= this.logLevel;
  }

  injectContextIntoHeaders(headers: Record<string, string> = {}): Record<string, string> {
    const injectedHeaders = { ...headers };
    propagation.inject(context.active(), injectedHeaders);
    return injectedHeaders;
  }

  getCurrentTraceId(): string | undefined {
    const activeSpan = trace.getSpan(context.active());
    return activeSpan?.spanContext().traceId;
  }

  getCurrentSpanId(): string | undefined {
    const activeSpan = trace.getSpan(context.active());
    return activeSpan?.spanContext().spanId;
  }
}

let globalLogger: IMcpLogger = new McpLogger();

export function initializeLogger(baseAttributes?: LogAttributes, logLevel?: LogLevel): IMcpLogger {
  globalLogger = new McpLogger(baseAttributes, logLevel);
  return globalLogger;
}

export function getLogger(): IMcpLogger {
  return globalLogger;
}

export function createMcpLogger(
  sessionId?: string,
  requestId?: string,
  userId?: string,
  operation?: string,
  logLevel?: LogLevel
): IMcpLogger {
  const attributes: LogAttributes = {};

  if (sessionId) attributes.sessionId = sessionId;
  if (requestId) attributes.requestId = requestId;
  if (userId) attributes.userId = userId;
  if (operation) attributes.operation = operation;

  return new McpLogger(attributes, logLevel);
}

export function createMcpAttributes(
  sessionId?: string,
  requestId?: string,
  userId?: string,
  operation?: string,
  additional?: LogAttributes
): LogAttributes {
  const attributes: LogAttributes = { ...additional };

  if (sessionId) attributes.sessionId = sessionId;
  if (requestId) attributes.requestId = requestId;
  if (userId) attributes.userId = userId;
  if (operation) attributes.operation = operation;

  return attributes;
}

export function injectContextIntoHeaders(
  headers: Record<string, string> = {}
): Record<string, string> {
  const injectedHeaders = { ...headers };
  propagation.inject(context.active(), injectedHeaders);
  return injectedHeaders;
}

export function getCurrentContext() {
  const activeSpan = trace.getSpan(context.active());
  return {
    traceId: activeSpan?.spanContext().traceId,
    spanId: activeSpan?.spanContext().spanId,
    hasActiveSpan: !!activeSpan,
  };
}

function parseLogLevelFromEnv(): LogLevel {
  const envLevel = process.env.LOG_LEVEL?.toUpperCase();

  switch (envLevel) {
    case "DEBUG":
      return LogLevel.DEBUG;
    case "INFO":
      return LogLevel.INFO;
    case "WARN":
    case "WARNING":
      return LogLevel.WARN;
    case "ERROR":
      return LogLevel.ERROR;
    case "OFF":
    case "NONE":
      return LogLevel.OFF;
    default:
      return LogLevel.INFO;
  }
}

export function setGlobalLogLevel(level: LogLevel): void {
  globalLogger.setLevel(level);
}

export function getGlobalLogLevel(): LogLevel {
  return globalLogger.getLevel();
}

export const logger = {
  setLevel: setGlobalLogLevel,
  isDebugEnabled: (): boolean => globalLogger.isLevelEnabled(LogLevel.DEBUG),
  isInfoEnabled: (): boolean => globalLogger.isLevelEnabled(LogLevel.INFO),
  isWarnEnabled: (): boolean => globalLogger.isLevelEnabled(LogLevel.WARN),
  isErrorEnabled: (): boolean => globalLogger.isLevelEnabled(LogLevel.ERROR),
};