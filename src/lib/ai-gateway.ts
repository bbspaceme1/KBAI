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

import { checkAiQuota, logAiUsage, estimateTokens, calculateAiCost } from "@/lib/ai-quota";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
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

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<string> {
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

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<string> {
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

  async complete(messages: ChatMessage[], options?: AiGatewayOptions): Promise<string> {
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
const limitAiGateway = rateLimitMiddleware(async (context) => {
  if (context.userId) return context.userId;
  try {
    const { userId } = await requireSupabaseAuth();
    return userId;
  } catch {
    return "anonymous";
  }
});

export const callAI = limitAiGateway(async function callAI<T = string>(
  messages: ChatMessage[],
  options: AiGatewayOptions = {},
): Promise<AiGatewayResult<T>> {
  const authenticatedUserId =
    options.userId ??
    (await (async () => {
      try {
        const auth = await requireSupabaseAuth();
        return auth.userId;
      } catch {
        return undefined;
      }
    })());

  const userId = authenticatedUserId ?? options.userId;
  const {
    operation = "unknown",
    model = "gemini-2.5-flash",
    timeout = DEFAULT_TIMEOUT_MS,
  } = options;

  try {
    // 1. Check user quota if userId provided
    if (userId) {
      const requestContent = messages.map((m) => m.content).join("\n");
      const estimatedInputTokens = estimateTokens(requestContent);

      // Prefer DB-side atomic reservation when available
      try {
        const { data, error } = await supabaseAdmin.rpc("try_consume_ai_quota", {
          p_user: userId,
          p_tokens: estimatedInputTokens,
        });
        if (error) {
          console.warn(
            "try_consume_ai_quota rpc error, falling back to app-side check:",
            error.message,
          );
        } else if (data === false) {
          throw new Error(
            "daily_limit_exceeded\n\nUpgrade to Premium untuk lebih banyak AI operations.",
          );
        }
      } catch (rpcErr) {
        // Fallback to application-side quota check if RPC is missing or fails
        const quotaCheck = await checkAiQuota(userId, estimatedInputTokens);
        if (!quotaCheck.allowed) {
          throw new Error(
            `${quotaCheck.reason}\n\nUpgrade to Premium untuk lebih banyak AI operations.`,
          );
        }
      }
    }

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

      // 3. Log usage
      const requestContent = messages.map((m) => m.content).join("\n");
      const inputTokens = providerResult.inputTokens ?? estimateTokens(requestContent);
      const outputTokens = providerResult.outputTokens ?? estimateTokens(responseText);
      const cost = calculateAiCost(model, inputTokens, outputTokens);

      if (userId) {
        await logAiUsage({
          user_id: userId,
          model,
          input_tokens: inputTokens,
          output_tokens: outputTokens,
          total_tokens: inputTokens + outputTokens,
          cost_usd: cost,
          operation,
          status: "success",
        }).catch((err) => {
          console.error("[AI Usage Log Error]", err);
          // Don't throw — logging shouldn't block the operation
        });
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
    // Log error if userId provided
    if (userId) {
      const errorMsg = error instanceof Error ? error.message : String(error);
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
        // Silently fail if logging fails
      });
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
