"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import ReactMarkdown from "react-markdown";
import { Loader2, Mic } from "lucide-react";
import AppShell from "@/app/components/AppShell";
import TopBar from "@/app/components/TopBar";
import { useDictation } from "@/app/components/useDictation";

interface Turn {
  id: string;
  role: string;
  content: string;
}

export default function InterviewRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [turns, setTurns] = useState<Turn[]>([]);
  const [answer, setAnswer] = useState("");
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");
  const spokenId = useRef<string | null>(null);
  const dictation = useDictation((transcript) =>
    setAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript)),
  );

  useEffect(() => {
    void fetch(`/api/interview?id=${sessionId}`)
      .then((response) => response.json())
      .then((data) => {
        setTurns(data.turns ?? []);
        setScore(data.session?.score ?? null);
        setFeedback(data.session?.feedback ?? "");
      });
  }, [sessionId]);

  useEffect(() => {
    const last = [...turns].reverse().find((turn) => turn.role === "interviewer");
    if (!last || feedback || spokenId.current === last.id) return;
    spokenId.current = last.id;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(last.content));
  }, [turns, feedback]);

  const submit = async (action: "answer" | "finish") => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/interview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action,
          sessionId,
          content: answer,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "Request failed");
        return;
      }
      if (action === "answer" && answer.trim()) {
        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "candidate", content: answer.trim() },
        ]);
        setAnswer("");
      }
      if (data.question) {
        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "interviewer", content: data.question },
        ]);
      }
      if (data.done) {
        setScore(data.score);
        setFeedback(data.feedback);
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <TopBar title={<span className="font-medium">Live interview</span>} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-3xl space-y-4">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`max-w-[85%] rounded-[22px] px-4 py-3 text-sm leading-relaxed ${
                turn.role === "candidate"
                  ? "ml-auto rounded-br-md bg-[#2a2a2e]"
                  : "border border-white/8 bg-white/[0.03]"
              }`}
            >
              <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">
                {turn.role}
              </p>
              {turn.content}
            </div>
          ))}

          {feedback ? (
            <article className="rounded-[28px] border border-white/10 bg-[var(--panel)] p-6">
              <p className="font-display text-6xl italic">
                {score == null ? "Scored" : score}
                <span className="text-base text-white/40"> / 100</span>
              </p>
              <div className="mt-4 text-sm leading-relaxed text-white/80 [&_h1]:text-base [&_h2]:mt-3 [&_h2]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
                <ReactMarkdown>{feedback}</ReactMarkdown>
              </div>
            </article>
          ) : (
            <div className="pt-4">
              <textarea
                value={answer}
                onChange={(event) => setAnswer(event.target.value)}
                placeholder="Your answer"
                rows={4}
                className="w-full rounded-[22px] border border-white/10 bg-black/20 p-4 text-sm outline-none placeholder:text-white/30"
              />
              {(error || dictation.error) && (
                <p className="mt-2 text-sm text-red-300">{error || dictation.error}</p>
              )}
              <div className="mt-3 flex gap-2">
                <button
                  type="button"
                  onClick={dictation.toggle}
                  disabled={dictation.transcribing}
                  className={`rounded-full border px-4 py-2 text-sm ${
                    dictation.listening ? "border-red-400 text-red-300" : "border-white/15"
                  }`}
                >
                  {dictation.transcribing ? (
                    <Loader2 className="mr-1 inline h-4 w-4 animate-spin" />
                  ) : (
                    <Mic className="mr-1 inline h-4 w-4" />
                  )}
                  {dictation.listening ? "Stop" : "Speak"}
                </button>
                <button
                  type="button"
                  disabled={busy || !answer.trim()}
                  onClick={() => void submit("answer")}
                  className="rounded-full bg-[var(--lime)] px-4 py-2 text-sm font-medium text-[var(--lime-ink)] disabled:opacity-40"
                >
                  {busy ? "Thinking…" : "Send answer"}
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void submit("finish")}
                  className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70"
                >
                  End and score
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
