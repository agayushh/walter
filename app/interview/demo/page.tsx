"use client";

import { useState } from "react";
import Link from "next/link";
import InterviewRoom, { type InterviewTurnView } from "@/app/components/InterviewRoom";
import {
  DEMO_QUESTION_LIMIT,
  INTERVIEW_LEVELS,
  INTERVIEW_ROLES,
  type InterviewLevel,
  type InterviewRole,
} from "@/app/lib/interviewRoles";

export default function InterviewDemoPage() {
  const [role, setRole] = useState<InterviewRole>("Frontend");
  const [difficulty, setDifficulty] = useState<InterviewLevel>("Mid-level");
  const [started, setStarted] = useState(false);
  const [turns, setTurns] = useState<InterviewTurnView[]>([]);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  const call = async (action: "next" | "finish", nextTurns: InterviewTurnView[]) => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/interview/demo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          role,
          difficulty,
          turns: nextTurns.map(({ role: speaker, content }) => ({ role: speaker, content })),
        }),
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok) {
        setError(data.message || "Request failed");
        return false;
      }
      const updated = data.question
        ? [...nextTurns, { id: crypto.randomUUID(), role: "interviewer", content: data.question }]
        : nextTurns;
      setTurns(updated);
      if (data.done) {
        setScore(data.score);
        setFeedback(data.feedback);
      }
      return true;
    } catch {
      setError("Request failed");
      return false;
    } finally {
      setBusy(false);
    }
  };

  const start = async () => {
    if (await call("next", [])) setStarted(true);
  };

  const answer = (content: string) =>
    call("next", [...turns, { id: crypto.randomUUID(), role: "candidate", content }]);

  const reset = () => {
    setStarted(false);
    setTurns([]);
    setScore(null);
    setFeedback("");
    setError("");
  };

  return (
    <main className="h-screen overflow-y-auto bg-[var(--canvas)] text-[var(--cream)]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--lime)] text-xs font-semibold text-[var(--lime-ink)]">
              p
            </span>
            <span className="text-sm font-medium">pptChat</span>
          </Link>
          <Link
            href="/sign-up"
            className="rounded-full bg-[var(--cream)] px-4 py-2 text-sm font-medium text-black"
          >
            Get started
          </Link>
        </header>

        {!started ? (
          <section className="mx-auto max-w-3xl pt-16">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--lime)]">
              Demo, no account
            </p>
            <h1 className="font-display mt-4 text-5xl italic tracking-tight">
              {DEMO_QUESTION_LIMIT} questions. Then a score.
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--mute)]">
              Speak or type your answers. Nothing is saved. Sign up for five-question rounds,
              job-description targeting, and a history of your scores.
            </p>

            <div className="mt-6 flex flex-wrap gap-2">
              {INTERVIEW_ROLES.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setRole(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    role === item
                      ? "border-[var(--lime)] bg-[var(--lime)] text-[var(--lime-ink)]"
                      : "border-white/12 text-white/70 hover:border-white/25"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            <div className="mt-3 flex gap-2">
              {INTERVIEW_LEVELS.map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => setDifficulty(item)}
                  className={`rounded-full border px-3 py-1.5 text-xs ${
                    difficulty === item
                      ? "border-white bg-white text-black"
                      : "border-white/12 text-white/70 hover:border-white/25"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
            {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
            <button
              type="button"
              disabled={busy}
              onClick={() => void start()}
              className="mt-6 rounded-full bg-[var(--lime)] px-5 py-2.5 text-sm font-medium text-[var(--lime-ink)] disabled:opacity-50"
            >
              {busy ? "Starting…" : "Start demo interview"}
            </button>
          </section>
        ) : (
          <section className="pt-10">
            <p className="mx-auto mb-4 max-w-3xl text-xs uppercase tracking-wider text-white/40">
              {difficulty} {role} · demo
            </p>
            <InterviewRoom
              turns={turns}
              score={score}
              feedback={feedback}
              busy={busy}
              error={error}
              onAnswer={answer}
              onFinish={() => void call("finish", turns)}
            />
            {feedback && (
              <div className="mx-auto mt-6 flex max-w-3xl flex-wrap gap-3">
                <Link
                  href="/sign-up"
                  className="rounded-full bg-[var(--lime)] px-5 py-2.5 text-sm font-medium text-[var(--lime-ink)]"
                >
                  Sign up for full rounds
                </Link>
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-full border border-white/15 px-5 py-2.5 text-sm text-white/70"
                >
                  Try another
                </button>
              </div>
            )}
          </section>
        )}
      </div>
    </main>
  );
}
