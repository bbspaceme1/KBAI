import { describe, test, expect, beforeEach } from "vitest";
import { CorrelationIdContext, createStructuredLog, logInfo, logError } from "../observability";

describe("Observability System", () => {
  beforeEach(() => {
    // Reset correlation ID for each test
    CorrelationIdContext.setRequestId("test-" + Date.now());
  });

  describe("Correlation ID", () => {
    test("generates unique request IDs", () => {
      const id1 = CorrelationIdContext.generate();
      const id2 = CorrelationIdContext.generate();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1.length).toBeGreaterThan(0);
    });

    test("maintains correlation ID across operations", () => {
      const initialId = CorrelationIdContext.getRequestId();

      const id1 = CorrelationIdContext.getRequestId();
      const id2 = CorrelationIdContext.getRequestId();

      expect(id1).toBe(initialId);
      expect(id2).toBe(initialId);
    });

    test("allows setting correlation ID", () => {
      const newId = "correlation-123";
      CorrelationIdContext.setRequestId(newId);

      expect(CorrelationIdContext.getRequestId()).toBe(newId);
    });
  });

  describe("Structured Logging", () => {
    test("creates structured log with all fields", () => {
      const log = createStructuredLog("info", "User logged in", {
        userId: "user-123",
      });

      expect(log.level).toBe("info");
      expect(log.message).toBe("User logged in");
      expect(log.timestamp).toBeDefined();
      expect(log.requestId).toBeDefined();
      expect(log.context).toEqual({ userId: "user-123" });
      expect(log.error).toBeUndefined();
    });

    test("includes error details when provided", () => {
      const testError = new Error("Database connection failed");
      const log = createStructuredLog("error", "Database error", undefined, testError);

      expect(log.level).toBe("error");
      expect(log.error).toBeDefined();
      expect(log.error?.name).toBe("Error");
      expect(log.error?.message).toBe("Database connection failed");
      expect(log.error?.stack).toBeDefined();
    });

    test("handles context objects", () => {
      const context = {
        userId: "user-456",
        action: "portfolio_update",
        duration: 234,
      };

      const log = createStructuredLog("info", "Portfolio updated", context);

      expect(log.context).toEqual(context);
    });

    test("log functions are callable", () => {
      expect(() => {
        logInfo("Test info message", { test: true });
      }).not.toThrow();

      expect(() => {
        logError("Test error message", new Error("Test"), { test: true });
      }).not.toThrow();
    });

    test("structured logs can be parsed as JSON", () => {
      const log = createStructuredLog("warn", "Test warning", { value: 42 });
      const jsonStr = JSON.stringify(log);
      const parsed = JSON.parse(jsonStr);

      expect(parsed.level).toBe("warn");
      expect(parsed.message).toBe("Test warning");
      expect(parsed.context.value).toBe(42);
    });
  });

  describe("Log Correlation", () => {
    test("all logs from same request share correlation ID", () => {
      const requestId = "request-correlation-123";
      CorrelationIdContext.setRequestId(requestId);

      const log1 = createStructuredLog("info", "Operation started");
      const log2 = createStructuredLog("info", "Operation completed");
      const log3 = createStructuredLog("error", "Cleanup failed", undefined, new Error("Test"));

      expect(log1.requestId).toBe(requestId);
      expect(log2.requestId).toBe(requestId);
      expect(log3.requestId).toBe(requestId);
    });

    test("different requests have different correlation IDs", () => {
      CorrelationIdContext.setRequestId("request-1");
      const log1 = createStructuredLog("info", "Request 1");

      CorrelationIdContext.setRequestId("request-2");
      const log2 = createStructuredLog("info", "Request 2");

      expect(log1.requestId).toBe("request-1");
      expect(log2.requestId).toBe("request-2");
      expect(log1.requestId).not.toBe(log2.requestId);
    });
  });

  describe("Log Levels", () => {
    test("supports all log levels", () => {
      const levels = ["info", "warn", "error", "debug"] as const;

      for (const level of levels) {
        const log = createStructuredLog(level, `Test ${level}`);
        expect(log.level).toBe(level);
      }
    });

    test("timestamp is ISO format", () => {
      const log = createStructuredLog("info", "Test");
      const timestamp = new Date(log.timestamp);

      expect(timestamp).toBeInstanceOf(Date);
      expect(timestamp.getTime()).toBeGreaterThan(0);
    });
  });
});
