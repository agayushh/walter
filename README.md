# pptChat

A ChatGPT-style workspace: streaming chat, a memory library, document context, voice, a scored interview booth, and a live debate arena.

## Stack

- Next.js 15, React 19, Tailwind
- Clerk authentication
- Neon Postgres + Drizzle
- Vercel AI SDK with Groq and Gemini (`LLM_PROVIDER`, or the in-app switcher)

## Features

- Streaming replies with stop, regenerate, markdown, copy, read-aloud, and markdown export
- Auto titles and searchable chat history
- Memories extracted from chats, plus a library to add or delete them
- PDF, DOCX, and text uploads that get pulled into later prompts; quiz generation from a file
- Browser voice input and speech playback
- Interview booth: role, level, optional job description, five questions, scorecard
- Debate arena: two sides stream in parallel, then a judge picks a winner

Feature tables (`memories`, `documents`, `interview_sessions`, `interview_turns`) are created on first use.

## Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). Sign in, then start a chat. Set `GROQ_API_KEY` or `GEMINI_API_KEY` before sending a message.
