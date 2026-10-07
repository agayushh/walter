import { google } from "@ai-sdk/google";
import { groq } from "@ai-sdk/groq";

/**
 * Single source of truth for which LLM backs the app.
 *
 * Set `LLM_PROVIDER` in `.env` to swap. Current default: `groq`.
 * - `groq`   → fast, cheap, good for streaming chat
 * - `gemini` → Google's hosted models (fallback)
 * - `ollama` → local model (added in Phase 4)
 *
 * Every chat / RAG / interview route must call `getModel()` rather than
 * importing a provider directly. That way flipping the env var re-routes
 * the entire app with zero code changes.
 */
const ALLOWED = new Set(["groq", "gemini"]);

export function resolveProvider(override?: string | null) {
  const requested = (override ?? "").toLowerCase();
  if (ALLOWED.has(requested)) return requested;
  return (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
}

export function getModel(override?: string | null) {
  const provider = resolveProvider(override);

  if (provider === "gemini") {
    if (process.env.GEMINI_API_KEY && !process.env.GOOGLE_GENERATIVE_AI_API_KEY) {
      process.env.GOOGLE_GENERATIVE_AI_API_KEY = process.env.GEMINI_API_KEY;
    }
    return google(process.env.GEMINI_MODEL ?? "gemini-2.5-flash");
  }

  return groq(process.env.GROQ_MODEL ?? "llama-3.3-70b-versatile");
}

export const ACTIVE_PROVIDER = (process.env.LLM_PROVIDER ?? "groq").toLowerCase();
