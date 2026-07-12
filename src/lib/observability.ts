const uuidv4 = () => crypto.randomUUID();

/**
 * Correlation ID utility for request tracing
 * Add this to middleware chain to enable distributed tracing
 */

export class CorrelationIdContext {
  private static requestId: string = uuidv4();

  static generate(): string {
    return uuidv4();
  }

  static getRequestId(): string {
    return CorrelationIdContext.requestId;
  }

  static setRequestId(id: string): void {
    CorrelationIdContext.requestId = id;
  }
}

/**
 * Structured logging for observability
 * Returns JSON-formatted logs that can be easily aggregated
 */
export interface StructuredLog {
  level: "info" | "warn" | "error" | "debug";
  message: string;
  timestamp: string;
  requestId: string;
  context?: Record<string, unknown>;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export function createStructuredLog(
  level: "info" | "warn" | "error" | "debug",
  message: string,
  context?: Record<string, unknown>,
  error?: Error,
): StructuredLog {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    requestId: CorrelationIdContext.getRequestId(),
    context,
    error: error
      ? {
          name: error.name,
          message: error.message,
          stack: error.stack,
        }
      : undefined,
  };
}

export function logInfo(message: string, context?: Record<string, unknown>): void {
  const log = createStructuredLog("info", message, context);
  console.log(JSON.stringify(log));
}

export function logWarn(message: string, context?: Record<string, unknown>): void {
  const log = createStructuredLog("warn", message, context);
  console.warn(JSON.stringify(log));
}

export function logError(message: string, error?: Error, context?: Record<string, unknown>): void {
  const log = createStructuredLog("error", message, context, error);
  console.error(JSON.stringify(log));
}

export function logDebug(message: string, context?: Record<string, unknown>): void {
  const log = createStructuredLog("debug", message, context);
  if (process.env.DEBUG) {
    console.debug(JSON.stringify(log));
  }
}
