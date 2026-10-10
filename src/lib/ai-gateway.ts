/**
 * Unified AI Gateway — Direct API provider routing with quota tracking
 *
 * Features:
 * - Multi-provider support (OpenAI, Anthropic, Gemini) with fallback chain
 * - Per-user quota enforcement (blocks unlimited calls)
 * - Usage logging and cost tracking
 * - No vendor lock-in: can swap providers without code changes
 * - Proper error handling and timeouts
 */

import { logAiUsage, estimateTokens, calculateAiCost } from "@/lib/ai-quota";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { rateLimitMiddleware } from "@/lib/rate-limiter";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface AiGatewayOptions {
  userId?: string;
  operation?: string; // e.g., 'stock_screener', 'market_insight'
  model?: string;
  temperature?: number;
  maxTokens?: number;
  timeout?: number;
}

export interface AiGatewayResult<T> {
  data: T;
  model: string;
  inputTokens: number;
  outputTokens: number;
  cost: number;
}

/**
 * Create a financial disclaimer for AI-generated content
 * Must be present on all user-facing AI outputs
 */
export const AI_FINANCIAL_DISCLAIMER = `
⚠️ **Disclaimer:** Konten ini dihasilkan oleh AI berdasarkan data historis dan bukan merupakan saran investasi profesional. 
Selalu lakukan riset mandiri dan konsultasikan dengan advisor keuangan berlisensi sebelum membuat keputusan investasi.
KBAI Terminal tidak bertanggung jawab atas keputusan finansial yang diambil berdasarkan konten ini.
`.trim();

const DEFAULT_TIMEOUT_MS = 40_000;

// ============================================================================
// Provider Implementations
// ============================================================================

interface ProviderResult {
  text: string;
  inputTokens?: number;
  outputTokens?: number;
}

interface AIProvider {
  complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<ProviderResult>;
  name: string;
}

class OpenAIProvider implements AIProvider {
  name = "openai";

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<ProviderResult> {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "gpt-4-turbo-preview",
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 2000,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OpenAI error: ${response.status} ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = (data.choices?.[0]?.message?.content as string) || "";
    const inputTokens = data.usage?.prompt_tokens ?? data.usage?.input_tokens ?? undefined;
    const outputTokens = data.usage?.completion_tokens ?? data.usage?.output_tokens ?? undefined;
    return { text, inputTokens, outputTokens };
  }
}

class AnthropicProvider implements AIProvider {
  name = "anthropic";

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<ProviderResult> {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "claude-3-5-sonnet-20241022",
        max_tokens: options?.maxTokens || 2000,
        temperature: options?.temperature || 0.7,
        system: systemMessage?.content || "",
        messages: userMessages,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Anthropic error: ${response.status} ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    // Anthropic responses vary — attempt to extract text and token usage
    const text = Array.isArray(data.content)
      ? data.content[0]?.text || ""
      : data.content?.[0]?.text || "";
    const inputTokens = data.usage?.input_tokens ?? undefined;
    const outputTokens = data.usage?.output_tokens ?? undefined;
    return { text, inputTokens, outputTokens };
  }
}

class GeminiProvider implements AIProvider {
  name = "gemini";

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<ProviderResult> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

    const model = options?.model || "gemini-2.5-flash";
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contents: [
            {
              parts: messages.map((m) => ({ text: m.content })),
            },
          ],
          generationConfig: {
            temperature: options?.temperature || 0.7,
            maxOutputTokens: options?.maxTokens || 2000,
          },
        }),
      },
    );

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Gemini error: ${response.status} ${text.slice(0, 200)}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
    // Gemini's response metadata may contain token usage in various fields
    const inputTokens = data.usage?.input_tokens ?? data.usage?.prompt_tokens ?? undefined;
    const outputTokens = data.usage?.output_tokens ?? data.usage?.completion_tokens ?? undefined;
    return { text, inputTokens, outputTokens };
  }
}

// ============================================================================
// Provider Chain
// ============================================================================

class AIProviderChain implements AIProvider {
  name = "chain";

  constructor(private providers: AIProvider[]) {}

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<ProviderResult> {
    const errors: string[] = [];

    for (const provider of this.providers) {
      try {
        return await provider.complete(messages, options);
      } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        errors.push(`${provider.name}: ${msg}`);
        console.warn(`[AI Provider] ${provider.name} failed:`, msg);
        continue;
      }
    }

    throw new Error(`All AI providers exhausted. Errors: ${errors.join(" | ")}`);
  }
}

// ============================================================================
// Main AI Gateway
// ============================================================================

function createProviderChain(): AIProviderChain {
  const providers: AIProvider[] = [];

  // Prefer order: Gemini (cost-effective) → OpenAI → Anthropic
  if (process.env.GEMINI_API_KEY) {
    providers.push(new GeminiProvider());
  }
  if (process.env.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider());
  }
  if (process.env.ANTHROPIC_API_KEY) {
    providers.push(new AnthropicProvider());
  }

  if (providers.length === 0) {
    throw new Error(
      "No AI provider configured. Set GEMINI_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY.",
    );
  }

  return new AIProviderChain(providers);
}

let _providerChain: AIProviderChain | null = null;

function getProviderChain(): AIProviderChain {
  if (!_providerChain) {
    _providerChain = createProviderChain();
  }
  return _providerChain;
}

// ============================================================================
// Public AI Gateway API
// ============================================================================

/**
 * Call AI with quota enforcement, logging, and cost tracking.
 * Automatically routes through provider chain if one fails.
 */
const limitAiGateway = rateLimitMiddleware(async () => {
  const { userId } = await requireSupabaseAuth();
  return userId;
});

export const callAI = limitAiGateway(async function callAI<T = string>(
  messages: ChatMessage[],
  options: AiGatewayOptions = {},
): Promise<AiGatewayResult<T>> {
  const { userId, supabase: userSupabase } = await requireSupabaseAuth();
  let quotaReservationId: string | null = null;
  const quotaRpc = userSupabase.rpc as unknown as (
    functionName: string,
    params: Record<string, unknown>,
  ) => Promise<{ data: unknown; error: { message: string } | null }>;
  const {
    operation = "unknown",
    model = "gemini-2.5-flash",
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  try {
    // 1. Reserve quota atomically with the authenticated user's JWT.
    if (!userId) throw new Error("Authentication required for AI quota enforcement");
    const requestContent = messages.map((m) => m.content).join("\n");
    const estimatedInputTokens = estimateTokens(requestContent);
    const reservedTokens = estimatedInputTokens + (options.maxTokens || 2000);
    const { data: reservationId, error } = await quotaRpc("reserve_ai_quota", {
      p_user: userId,
      p_tokens: reservedTokens,
    });

    if (error) {
      console.error("[AI Quota] Atomic reservation failed:", error.message);
      throw new Error("AI quota enforcement unavailable. Please retry later.");
    }
    if (typeof reservationId !== "string" || reservationId.length === 0) {
      throw new Error(
        "daily_limit_exceeded\n\nUpgrade to Premium untuk lebih banyak AI operations.",
      );
    }
    quotaReservationId = reservationId;

    // 2. Make AI request with timeout
    const controller = new AbortController();
    const timeoutHandle = setTimeout(() => controller.abort(), timeout);

    try {
      const chain = getProviderChain();

      // For JSON responses, inject JSON mode into system prompt if model supports it
      const modifiedMessages = messages;
      if (typeof options !== "undefined" && options.model?.includes("gpt")) {
        // OpenAI models with JSON mode - find last user message manually (findLast not available on older lib targets)
        let lastUserMsg: ChatMessage | undefined = undefined;
        for (let i = modifiedMessages.length - 1; i >= 0; i--) {
          if (modifiedMessages[i].role === "user") {
            lastUserMsg = modifiedMessages[i];
            break;
          }
        }
        if (lastUserMsg && !lastUserMsg.content.includes("JSON")) {
          // Already asking for JSON, don't double it
          // Keep as is
        }
      }

      const providerPromise = chain.complete(modifiedMessages, { ...options, model });
      const responsePromise = Promise.race([
        providerPromise,
        new Promise<ProviderResult>((_, reject) =>
          setTimeout(() => reject(new Error("AI request timeout")), timeout),
        ),
      ]);
      const providerResult = (await responsePromise) as ProviderResult;
      const responseText = providerResult.text;

      // Parse response (try JSON first, fallback to string)
      let result: T;
      try {
        result = JSON.parse(responseText) as T;
      } catch {
        result = responseText as unknown as T;
      }

      // 3. Finalize the reservation in-place to avoid double-counting.
      const requestContent = messages.map((m) => m.content).join("\n");
      const inputTokens = providerResult.inputTokens ?? estimateTokens(requestContent);
      const outputTokens = providerResult.outputTokens ?? estimateTokens(responseText);
      const cost = calculateAiCost(model, inputTokens, outputTokens);

      if (quotaReservationId) {
        const { data: finalized, error: finalizeError } = await quotaRpc(
          "finalize_ai_quota_reservation",
          {
            p_reservation_id: quotaReservationId,
            p_model: model,
            p_input_tokens: inputTokens,
            p_output_tokens: outputTokens,
            p_cost_usd: cost,
            p_operation: operation,
            p_status: "success",
            p_error_message: null,
          },
        );
        if (finalizeError || finalized !== true) {
          // The reservation remains counted if finalization fails, preventing a
          // quota bypass. Do not add a second usage row for the same request.
          console.error(
            "[AI Quota] Finalization failed; reservation remains counted:",
            finalizeError?.message ?? "unexpected RPC result",
          );
        } else {
          quotaReservationId = null;
        }
      }

      return {
        data: result,
        model,
        inputTokens,
        outputTokens,
        cost,
      };
    } finally {
      clearTimeout(timeoutHandle);
    }
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);

    if (userId) {
      if (quotaReservationId) {
        // A timed-out provider request may still be billable; keep its reservation.
        if (/timeout|abort/i.test(errorMsg)) {
          console.error("[AI Quota] Provider timed out; reservation remains counted");
        } else {
          const { data: finalized, error: finalizeError } = await quotaRpc(
            "finalize_ai_quota_reservation",
            {
              p_reservation_id: quotaReservationId,
              p_model: options.model || "unknown",
              p_input_tokens: 0,
              p_output_tokens: 0,
              p_cost_usd: 0,
              p_operation: operation,
              p_status: "error",
              p_error_message: errorMsg,
            },
          );
          if (finalizeError || finalized !== true) {
            console.error(
              "[AI Quota] Failed to release failed request reservation:",
              finalizeError?.message ?? "unexpected RPC result",
            );
          } else {
            quotaReservationId = null;
          }
        }
      } else {
        // Log failures that occur before a reservation is successfully created.
        await logAiUsage({
          user_id: userId,
          model: options.model || "unknown",
          input_tokens: 0,
          output_tokens: 0,
          total_tokens: 0,
          cost_usd: 0,
          operation,
          status: "error",
          error_message: errorMsg,
        }).catch(() => {
          // Silently fail if logging fails.
        });
      }
    }

    throw error;
  }
});

/**
 * Legacy function for backwards compatibility.
 * Wraps callAI() to return just the data.
 * @deprecated Use callAI() instead
 */
export async function callAILegacy<T = string>(
  messages: ChatMessage[],
  options: AiGatewayOptions = {},
): Promise<T> {
  const result = await callAI<T>(messages, options);
  return result.data;
}

/**
 * Helper to easily construct a completion request
 */
export async function completePrompt(
  prompt: string,
  systemPrompt = "",
  options: AiGatewayOptions = {},
): Promise<string> {
  const messages: ChatMessage[] = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: prompt });

  const result = await callAI(messages, options);
  return typeof result.data === "string" ? result.data : JSON.stringify(result.data);
}
