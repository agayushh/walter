# Walter Project — Proof Plan

## Current State (verified)

**What works:**
- Next.js 15 + Clerk auth + Neon PostgreSQL (Drizzle ORM)
- Chat CRUD: create chat, save messages, fetch history (`/api/user/chats/...`)
- Sidebar, TextInputArea, ChatClient UI built
- `@ai-sdk/google` + `streamText` ready to wire up
- `mem0ai` already in package.json (memory layer tooling)
- `pdf-parse`, `mammoth`, `react-dropzone`, `sharp` installed
- `.env` has Gemini key, OpenAI key, Clerk keys, **MEM0_API_KEY already set**

**What's broken / missing (verified):**
- `app/api/chat/route.ts` is **completely empty** — no AI responses ever returned
- `TextInputArea` send button saves user message but **never calls an AI endpoint**
- `ChatClient` renders messages but no streaming, no assistant reply
- File upload routes deleted (`/api/upload/files`, `/api/upload/images`) — plus button does nothing
- Mic button does nothing
- Recent git history: lots of refactoring/cleanup, **zero feature progress**

---

## North Star

A self-serve AI platform where anyone can:
1. Chat with an AI that **remembers them** (mem0 memory layer)
2. **Upload documents and chat with them** (RAG over their files)
3. **Run a real AI interview** they can take on their own (voice + RAG + scoring)
4. Behind the scenes: route to **local LLM (Ollama) in dev** and **API (Gemini/Groq) in prod** — single switch

---

## The Plan (6 phases)

### Phase 0 — Wire the chat AI (day 1, blocker for everything)

`app/api/chat/route.ts` is empty. Fix this first, nothing else works without it.

- Rewrite `/api/chat/route.ts` with `streamText` + Gemini, full conversation history from DB
- Modify `TextInputArea.handleSend` to POST to `/api/chat` and read the streaming response
- Modify `ChatClient` to append streamed chunks into the assistant message in real time
- **Provider abstraction** lives here too: an `llmProvider` env flag (`local` | `gemini` | `groq`) that picks the model. Local = Ollama via `ollama-ai-provider`, prod = Gemini or Groq.

**Single most important deliverable.** Until this works, no RAG, no interview, no memory has anything to attach to.

### Phase 1 — Memory layer (mem0)

`mem0ai` is already installed and your `.env` already has the key. mem0 stores long-term user facts (preferences, past context, interview history) and injects them into every prompt.

- `app/lib/memory/recall.ts` — fetch relevant memories for a user_id + query
- `app/lib/memory/extract.ts` — extract new facts from each conversation turn
- Hook into `/api/chat`: before streamText, recall memories → inject into system prompt. After response, extract new facts.
- Pass `userId = clerkId` as the mem0 scope (so memories are per-user, isolated).
- Add a `/api/memory` GET route + a small `MemoryPanel` UI so users can see/edit what the AI remembers.

**Why now:** every later feature (interview scoring, RAG context) gets richer when the AI knows the user's history.

### Phase 2 — RAG (chat with your documents)

- Enable `pgvector` extension on Neon
- Add `documents` + `document_chunks(embedding vector(768))` to Drizzle schema, HNSW index
- `app/lib/rag/embed.ts` — Gemini `text-embedding-004`
- `app/lib/rag/processDocument.ts` — chunk (1000 chars, 200 overlap) → embed → store
- `app/lib/rag/search.ts` — cosine similarity, top-k=5
- Restore `/api/upload/files/route.ts` — wire `react-dropzone` + `pdf-parse`/`mammoth`, call `processDocument`
- Modify `/api/chat` — before calling LLM, embed user query, search chunks, inject into context
- UI: attach button on `TextInputArea`, show uploaded doc chips

### Phase 3 — Voice (STT + TTS)

- `/api/voice/transcribe` → Groq Whisper (free, fast)
- `/api/voice/speak` → browser `SpeechSynthesis` first, upgrade to Google TTS if needed
- `MicButton` component → `MediaRecorder` → blob → transcribe → fill input
- Speaker icon on assistant messages → TTS playback

### Phase 4 — Local LLM routing (your specific ask)

This is the switchable provider. Goal: dev = Ollama, prod = API.

- Install `ollama-ai-provider` (Vercel AI SDK provider for Ollama)
- `app/lib/llm/provider.ts`:
  ```ts
  const provider = process.env.LLM_PROVIDER ?? 'gemini'
  if (provider === 'local') return ollama(process.env.OLLAMA_MODEL ?? 'llama3.2')
  if (provider === 'groq') return groq(process.env.GROQ_MODEL ?? 'llama-3.3-70b')
  return google('gemini-2.5-flash')
  ```
- All chat routes call this factory. Single env flag flips between local and prod.
- Document in README: `ollama pull llama3.2` → set `LLM_PROVIDER=local` → done.
- Optional: same switch for embeddings (nomic-embed-text locally, Gemini in prod).

### Phase 5 — Self-serve AI Interview (the "people come and interview themselves" feature)

This is the public-facing, productized feature. Builds on 0–3.

- New schema tables: `interview_sessions` (id, userId/clerkId, role, difficulty, status, score), `interview_messages`, `interview_evaluations`
- `/interview` page — pick role (Frontend, Backend, ML, etc.) and difficulty
- `InterviewSession.tsx` — voice loop: STT → chat → TTS, with RAG context from an uploaded job description
- After interview: AI evaluates (technical depth, communication, confidence) and writes a score + feedback to `interview_evaluations`
- `/interview/history` — past attempts with scores
- **Public access**: by default requires auth, but `/interview/demo` is a no-auth sandbox for anonymous visitors (rate-limited)

### Phase 6 — Polish for "people come and use it"

- Landing page rewrite explaining what Walter does (RAG, memory, interview, local+API)
- Pricing-style cards: Free (local LLM by user, your memory) vs Pro (Gemini Pro, bigger context, interview analytics)
- If you want to actually monetize: Stripe + tier-gating on model selection + interview history retention
- Deploy: Vercel for Next.js, Neon already on prod tier, Ollama runs on a small VPS or local-only mode

---

## Recommended order (max learning value per phase)

| # | Phase | Time | Why this order |
|---|-------|------|----------------|
| 0 | Wire streaming chat + provider switch | 1 day | Unblocks everything; verifies the abstraction |
| 1 | Memory layer | 1 day | Already have the key, high learning value |
| 2 | RAG | 2 days | Document upload is table-stakes for AI products |
| 4 | Local LLM routing | 0.5 day | Tiny once Phase 0 is done |
| 3 | Voice | 1 day | Needed for the interview feature |
| 5 | Interview product | 2–3 days | The headline user-facing feature |
| 6 | Polish/landing/monetization | ongoing | Marketing layer |

**Phase 4 is deliberately slotted in early** because it's mostly a config layer — small effort, big demo impact (you can literally flip a flag and show "AI running on my laptop").

---

## File-level change map

| File | Phase | Action |
|------|-------|--------|
| `app/api/chat/route.ts` | 0,1,2,4 | Rewrite — streaming + provider factory + memory + RAG |
| `app/lib/llm/provider.ts` | 0,4 | CREATE — provider factory |
| `app/lib/memory/{recall,extract}.ts` | 1 | CREATE — mem0 wrapper |
| `app/api/memory/route.ts` | 1 | CREATE — memory CRUD |
| `app/components/MemoryPanel.tsx` | 1 | CREATE |
| `db/schema/{rag,interview}.ts` | 2,5 | CREATE |
| `app/lib/rag/{embed,processDocument,search}.ts` | 2 | CREATE |
| `app/api/upload/files/route.ts` | 2 | RESTORE + wire dropzone |
| `app/components/FileUpload.tsx` | 2 | CREATE — restore + RAG trigger |
| `app/api/voice/{transcribe,speak}/route.ts` | 3 | CREATE |
| `app/components/MicButton.tsx` | 3 | CREATE |
| `app/interview/page.tsx` + `InterviewSession.tsx` | 5 | CREATE |
| `app/api/interview/[sessionId]/*` | 5 | CREATE — sessions, scoring |
| `.env.example` | 0,1,3,4 | CREATE — document all switches |

---

## Quick wins to ship in a single sitting

1. Fill `app/api/chat/route.ts` with a minimal Gemini `streamText` so chat works.
2. Hook `TextInputArea` to call it and append streamed chunks.
3. Add `LLM_PROVIDER` switch with one alternative (Groq or Ollama).

That's the demo that proves the whole architecture: AI working, switchable model, streaming, memory-ready hooks. Everything else layers on top.