/**
 * Unified AI Client for LoomGuard
 * Supports:
 * 1. NVIDIA NIM API (when NVIDIA_API_KEY is provided in .env)
 * 2. Fallback to z-ai-web-dev-sdk if available
 */

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CompletionOptions {
  messages: ChatMessage[];
  temperature?: number;
  max_tokens?: number;
  thinking?: { type?: string };
}

export interface CompletionResult {
  choices: Array<{
    index?: number;
    message: {
      role: string;
      content: string;
      reasoning_content?: string;
    };
    finish_reason?: string;
  }>;
}

export function getAiModel(): string {
  if (process.env.NVIDIA_API_KEY) {
    const custom = process.env.NVIDIA_MODEL?.trim().replace(/^["']|["']$/g, "").trim();
    return custom || "meta/muse-glimmer-30b";
  }
  return process.env.LLM_MODEL || "glm-4.6";
}

export async function createChatCompletion(options: CompletionOptions): Promise<CompletionResult> {
  const rawKey = process.env.NVIDIA_API_KEY || "";
  const nvidiaKey = rawKey.trim().replace(/^["']|["']$/g, "").trim();

  if (nvidiaKey) {
    const rawBaseUrl = process.env.NVIDIA_BASE_URL || "https://integrate.api.nvidia.com/v1";
    const baseURL = rawBaseUrl.trim().replace(/^["']|["']$/g, "").replace(/\/+$/, "");
    const model = getAiModel();

    // Map first 'assistant' message to 'system' for OpenAI/NVIDIA API compatibility
    const formattedMessages = options.messages.map((m, idx) => {
      if (idx === 0 && m.role === "assistant") {
        return { role: "system" as const, content: m.content };
      }
      return { role: m.role, content: m.content };
    });

    const res = await fetch(`${baseURL}/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${nvidiaKey}`,
      },
      body: JSON.stringify({
        model,
        messages: formattedMessages,
        temperature: options.temperature ?? 0.2,
        max_tokens: options.max_tokens ?? 2048,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`NVIDIA API call failed (${res.status}): ${errText}`);
    }

    interface RawResponse {
      choices?: Array<{
        index?: number;
        message?: {
          role?: string;
          content?: string | null;
          reasoning_content?: string;
        };
        finish_reason?: string;
      }>;
    }

    const data = (await res.json()) as RawResponse;
    if (data.choices) {
      for (const choice of data.choices) {
        if (choice.message) {
          if (choice.message.content === null && choice.message.reasoning_content) {
            choice.message.content = choice.message.reasoning_content;
          }
          choice.message.content = choice.message.content ?? "";
        }
      }
    }

    return data as CompletionResult;
  }

  // Fallback to z-ai-web-dev-sdk if present
  try {
    const { default: ZAI } = await import("z-ai-web-dev-sdk");
    const zai = await ZAI.create();
    return (await zai.chat.completions.create(options)) as CompletionResult;
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    throw new Error(`No AI provider configured or failed: ${msg}. Set NVIDIA_API_KEY in .env to use NVIDIA NIM.`);
  }
}

export const ai = {
  chat: {
    completions: {
      create: createChatCompletion,
    },
  },
};

export default ai;
