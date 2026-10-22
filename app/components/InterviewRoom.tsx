"use client";

import { useEffect, useRef, useState } from "react";
import ReactMarkdown from "react-markdown";
import { Loader2, Mic } from "lucide-react";
import { useDictation } from "@/app/components/useDictation";

export interface InterviewTurnView {
  id: string;
  role: string;
  content: string;
}

interface InterviewRoomProps {
  turns: InterviewTurnView[];
  score: number | null;
  feedback: string;
  busy: boolean;
  error: string;
  /** Resolve true once the answer is accepted so the box clears. */
  onAnswer: (answer: string) => Promise<boolean>;
  onFinish: () => void;
}

export default function InterviewRoom({
  turns,
  score,
  feedback,
  busy,
  error,
  onAnswer,
  onFinish,
}: InterviewRoomProps) {
  const [answer, setAnswer] = useState("");
  const spokenId = useRef<string | null>(null);
  const dictation = useDictation((transcript) =>
    setAnswer((prev) => (prev ? `${prev} ${transcript}` : transcript)),
  );

  useEffect(() => {
    const last = [...turns].reverse().find((turn) => turn.role === "interviewer");
    if (!last || feedback || spokenId.current === last.id) return;
    spokenId.current = last.id;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(new SpeechSynthesisUtterance(last.content));
  }, [turns, feedback]);

  const send = async () => {
    if (await onAnswer(answer.trim())) setAnswer("");
  };

  return (
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
          <p className="mb-1 text-[10px] uppercase tracking-wider text-white/40">{turn.role}</p>
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
          <div className="mt-3 flex flex-wrap gap-2">
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
              onClick={() => void send()}
              className="rounded-full bg-[var(--lime)] px-4 py-2 text-sm font-medium text-[var(--lime-ink)] disabled:opacity-40"
            >
              {busy ? "Thinking…" : "Send answer"}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={onFinish}
              className="rounded-full border border-white/15 px-4 py-2 text-sm text-white/70"
            >
              End and score
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
