"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import TopBar from "@/app/components/TopBar";
import {
  INTERVIEW_LEVELS,
  INTERVIEW_ROLES,
  type InterviewLevel,
  type InterviewRole,
} from "@/app/lib/interviewRoles";

interface SessionRow {
  id: string;
  role: string;
  difficulty: string;
  status: string;
  score: number | null;
  createdAt: string;
}

export default function InterviewPage() {
  const router = useRouter();
  const [role, setRole] = useState<InterviewRole>("Frontend");
  const [difficulty, setDifficulty] = useState<InterviewLevel>("Mid-level");
  const [jobDescription, setJobDescription] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [sessions, setSessions] = useState<SessionRow[]>([]);

  useEffect(() => {
    void fetch("/api/interview")
      .then((response) => response.json())
      .then((data) => setSessions(data.sessions ?? []))
      .catch(() => {});
  }, []);

  const start = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "start",
          role,
          difficulty,
          jobDescription,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Could not start the interview");
        return;
      }
      router.push(`/interview/${data.sessionId}`);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <TopBar title={<span className="font-medium">Interview</span>} />
      <div className="flex-1 overflow-y-auto px-6 py-8">
        <div className="mx-auto max-w-3xl">
          <h2 className="font-display text-5xl italic tracking-tight">Five questions. Then a score.</h2>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-[var(--mute)]">
            Speak your answers or type them. Paste a job description if you want the
            questions aimed at a specific posting.
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

          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            placeholder="Optional job description"
            rows={5}
            className="mt-5 w-full rounded-2xl border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-white/30"
          />
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}
          <button
            type="button"
            disabled={busy}
            onClick={() => void start()}
            className="mt-4 rounded-full bg-[var(--lime)] px-5 py-2.5 text-sm font-medium text-[var(--lime-ink)] disabled:opacity-50"
          >
            {busy ? "Starting…" : "Start interview"}
          </button>

          {sessions.length > 0 && (
            <div className="mt-10">
              <h2 className="text-xs uppercase tracking-wider text-white/40">Past rounds</h2>
              <ul className="mt-3 space-y-2">
                {sessions.map((session) => (
                  <li key={session.id}>
                    <button
                      type="button"
                      onClick={() => router.push(`/interview/${session.id}`)}
                      className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left hover:bg-white/[0.06]"
                    >
                      <span>
                        {session.difficulty} {session.role}
                      </span>
                      <span className="text-sm text-white/50">
                        {session.score == null ? session.status : `${session.score}/100`}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
