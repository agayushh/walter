# pptChat

A ChatGPT-style workspace: streaming chat, a memory library, document context, voice, a scored interview booth, and a live debate arena.

## Stack

- Next.js 15, React 19, Tailwind
- Clerk authentication
- Neon Postgres + Drizzle
- Vercel AI SDK with Groq, Gemini, or a local Ollama model (`LLM_PROVIDER`, or the in-app switcher)

## Features

- Streaming replies with stop, regenerate, markdown, copy, read-aloud, and markdown export
- Auto titles and searchable chat history
- Memories extracted from chats, plus a library to add or delete them
- PDF, DOCX, and text uploads that get pulled into later prompts; quiz generation from a file
- Voice input in every browser: the Web Speech API in Chrome and Edge, Groq Whisper elsewhere
- Interview booth: role, level, optional job description, five questions, scorecard
- Public demo at `/interview/demo`: three questions, no account, nothing stored, rate-limited per IP
- Debate arena: two sides stream in parallel, then a judge picks a winner

Feature tables (`memories`, `documents`, `interview_sessions`, `interview_turns`) are created on first use.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in, then start a chat. Set `GROQ_API_KEY` or `GEMINI_API_KEY` before sending a message. `GROQ_MODEL` must be a model your key can use; Groq retires models, so check the [model list](https://console.groq.com/docs/models) if chat returns `model_not_found`.

## Models

| `LLM_PROVIDER` | Needs | Model variable |
| --- | --- | --- |
| `groq` (default) | `GROQ_API_KEY` | `GROQ_MODEL` (default `openai/gpt-oss-120b`) |
| `gemini` | `GEMINI_API_KEY` | `GEMINI_MODEL` (default `gemini-2.5-flash`) |
| `ollama` or `local` | Ollama running | `OLLAMA_MODEL` (default `llama3.2`), `OLLAMA_BASE_URL` |

Every route gets its model from `getModel()` in `app/lib/llm/provider.ts`, so one variable re-routes the whole app. The model switcher in the chat header overrides it for chat and the arena in that browser.

### Running on a local model

```bash
ollama pull llama3.2
# in .env
LLM_PROVIDER=ollama
```

Ollama is reached through its OpenAI-compatible API at `http://localhost:11434/v1`. Point `OLLAMA_BASE_URL` elsewhere to use a model on another machine.

Voice transcription always uses Groq Whisper (`GROQ_TRANSCRIBE_MODEL`), so browsers without the Web Speech API still need `GROQ_API_KEY`.

## Notes

- The demo's rate limit is kept in server memory, so on serverless each warm instance counts separately. It stops casual abuse, not determined abuse.
- Document context uses keyword-ranked excerpts rather than embeddings, so it works the same with any provider, including local models.
