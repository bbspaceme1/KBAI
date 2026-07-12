interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

interface AIOptions {
  model?: string;
  temperature?: number;
  maxTokens?: number;
}

interface AIProvider {
  complete(messages: ChatMessage[], options?: AIOptions): Promise<string>;
}

class OpenAIProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async complete(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "gpt-4",
        messages,
        temperature: options?.temperature || 0.7,
        max_tokens: options?.maxTokens || 1000,
      }),
    });

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  }
}

class AnthropicProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async complete(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const systemMessage = messages.find((m) => m.role === "system");
    const userMessages = messages.filter((m) => m.role !== "system");

    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": this.apiKey,
        "anthropic-version": "2023-06-01",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: options?.model || "claude-3-sonnet-20240229",
        max_tokens: options?.maxTokens || 1000,
        temperature: options?.temperature || 0.7,
        system: systemMessage?.content || "",
        messages: userMessages,
      }),
    });

    if (!response.ok) {
      throw new Error(`Anthropic API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.content?.[0]?.text || "";
  }
}

class GeminiProvider implements AIProvider {
  constructor(private apiKey: string) {}

  async complete(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${options?.model || "gemini-pro"}:generateContent?key=${this.apiKey}`,
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
            maxOutputTokens: options?.maxTokens || 1000,
          },
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`Gemini API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  }
}

class AIProviderChain implements AIProvider {
  constructor(private providers: AIProvider[]) {}

  async complete(messages: ChatMessage[], options?: AIOptions): Promise<string> {
    for (const provider of this.providers) {
      try {
        return await provider.complete(messages, options);
      } catch (error) {
        console.warn(`AI provider failed: ${error}`);
        continue;
      }
    }
    throw new Error("All AI providers failed");
  }
}

export function createAIProvider(): AIProvider {
  const providers: AIProvider[] = [];

  if (process.env.OPENAI_API_KEY) {
    providers.push(new OpenAIProvider(process.env.OPENAI_API_KEY));
  }

  if (process.env.ANTHROPIC_API_KEY) {
    providers.push(new AnthropicProvider(process.env.ANTHROPIC_API_KEY));
  }

  if (process.env.GEMINI_API_KEY) {
    providers.push(new GeminiProvider(process.env.GEMINI_API_KEY));
  }

  if (providers.length === 0) {
    throw new Error("No AI provider API keys configured");
  }

  return new AIProviderChain(providers);
}
