// Resolved merge: keep HEAD (quota tracking + retry)
/**
 * AI Client with quota tracking and security
 *
 * This client wraps external AI API calls with:
 * - Per-user quota enforcement
 * - Usage logging for monitoring
 * - Cost tracking
 * - Error handling with fallbacks
 */

import { callAI, ChatMessage, AiGatewayResult } from "@/lib/ai-gateway";

export interface AiCallOptions {
  userId?: string;
  operation?: string;
  model?: string;
  timeout?: number;
}

/**
 * Backwards-compatible adapter for older code that used `callLovableAi({ messages, model })`.
 * This adapter delegates to the unified `callAI()` gateway and returns a shaped result
 * similar to the previous `callLovableAi` return value.
 */
export async function callLovableAi<T = unknown>(
  body: { messages?: ChatMessage[]; model?: string } | unknown,
  options: AiCallOptions = {},
): Promise<{
  data: T | { choices?: { message?: { content?: string } }[] };
  inputTokens: number;
  outputTokens: number;
  cost: number;
}> {
  // Normalize input: allow both the old body shape and direct messages
  let messages: ChatMessage[] = [];
  if (Array.isArray(body)) messages = body as ChatMessage[];
  else messages = ((body as { messages?: ChatMessage[] })?.messages as ChatMessage[]) || [];

  let modelFromBody: string | undefined = undefined;
  if (body && typeof body === "object") {
    const b = body as Record<string, unknown>;
    if ("model" in b && typeof b.model === "string") modelFromBody = b.model;
  }

  const gatewayResult: AiGatewayResult<unknown> = await callAI(messages, {
    userId: options.userId,
    operation: options.operation,
    model: options.model ?? modelFromBody,
    timeout: options.timeout,
  });

  // Adapt to legacy shape: wrap string responses into choices/message.content
  const adaptedData =
    typeof gatewayResult.data === "string"
      ? { choices: [{ message: { content: gatewayResult.data } }] }
      : gatewayResult.data;

  return {
    data: adaptedData as T,
    inputTokens: gatewayResult.inputTokens,
    outputTokens: gatewayResult.outputTokens,
    cost: gatewayResult.cost,
  };
}

export async function callLovableAiLegacy<T = string>(
  body: { messages?: ChatMessage[]; model?: string } | unknown,
  timeoutMs = 40_000,
): Promise<T> {
  const res = await callLovableAi<T>(body, { timeout: timeoutMs });
  const maybe = res.data as unknown as { choices?: { message?: { content?: string } }[] };
  const content = maybe?.choices?.[0]?.message?.content;
  if (content != null) return content as unknown as T;
  return res.data as unknown as T;
}
