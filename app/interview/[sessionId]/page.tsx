"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import TopBar from "@/app/components/TopBar";
import InterviewRoom, { type InterviewTurnView } from "@/app/components/InterviewRoom";

export default function InterviewRoomPage() {
  const params = useParams<{ sessionId: string }>();
  const sessionId = params.sessionId;
  const [turns, setTurns] = useState<InterviewTurnView[]>([]);
  const [busy, setBusy] = useState(false);
  const [score, setScore] = useState<number | null>(null);
  const [feedback, setFeedback] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    void fetch(`/api/interview?id=${sessionId}`)
      .then((response) => response.json())
      .then((data) => {
        setTurns(data.turns ?? []);
        setScore(data.session?.score ?? null);
        setFeedback(data.session?.feedback ?? "");
      });
  }, [sessionId]);

  const submit = async (action: "answer" | "finish", answer = "") => {
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
        return false;
      }
      if (action === "answer" && answer) {
        setTurns((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "candidate", content: answer },
        ]);
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
      return true;
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <TopBar title={<span className="font-medium">Live interview</span>} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <InterviewRoom
          turns={turns}
          score={score}
          feedback={feedback}
          busy={busy}
          error={error}
          onAnswer={(answer) => submit("answer", answer)}
          onFinish={() => void submit("finish")}
        />
      </div>
    </AppShell>
  );
}
