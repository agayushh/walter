import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

/**
 * Single source of truth for which LLM backs the app.
 *
 * Set `LLM_PROVIDER` in `.env` to swap. Current default: `groq`.
 * - `groq`   → fast, cheap, good for streaming chat
 * - `gemini` → Google's hosted models (fallback)
 * - `ollama` → local model through Ollama's OpenAI-compatible API (`local` works too)
 *
 * Every chat / RAG / interview route must call `getModel()` rather than
 * importing a provider directly. That way flipping the env var re-routes
 * the entire app with zero code changes.
 */
export const PROVIDERS = ["groq", "gemini", "ollama"] as const;
export type Provider = (typeof PROVIDERS)[number];

function normalize(value?: string | null): Provider | null {
  const lower = (value ?? "").toLowerCase();
  if (lower === "local") return "ollama";
  return (PROVIDERS as readonly string[]).includes(lower) ? (lower as Provider) : null;
}

export function resolveProvider(override?: string | null): Provider {
  return normalize(override) ?? normalize(process.env.LLM_PROVIDER) ?? "groq";
}

const ollama = createOpenAICompatible({
  name: "ollama",
  baseURL: process.env.OLLAMA_BASE_URL ?? "http://localhost:11434/v1",
});

export function getModel(override?: string | null) {
  const provider = resolveProvider(override);

  if (provider === "ollama") {
    return ollama(process.env.OLLAMA_MODEL ?? "llama3.2");
  }

  if (provider === "gemini") {
    if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
    }
    return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  }

  return groq(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile");
}

export const ACTIVE_PROVIDER = resolveProvider();
