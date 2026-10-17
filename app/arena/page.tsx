"use client";

import { useState } from "react";
import AppShell from "@/app/components/AppShell";
import TopBar from "@/app/components/TopBar";

function splitDebate(raw: string) {
  const proIndex = raw.indexOf("<<<PRO>>>");
  const conIndex = raw.indexOf("<<<CON>>>");
  if (proIndex === -1) {
    return { pro: raw.replaceAll("<<<PRO>>>", "").replaceAll("<<<CON>>>", ""), con: "" };
  }
  const pro =
    conIndex === -1
      ? raw.slice(proIndex + "<<<PRO>>>".length)
      : raw.slice(proIndex + "<<<PRO>>>".length, conIndex);
  const con = conIndex === -1 ? "" : raw.slice(conIndex + "<<<CON>>>".length);
  return { pro: pro.trim(), con: con.trim() };
}

export default function ArenaPage() {
  const [topic, setTopic] = useState("Should junior engineers use AI to write production code?");
  const [pro, setPro] = useState("");
  const [con, setCon] = useState("");
  const [verdict, setVerdict] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const debate = async () => {
    setBusy(true);
    setError("");
    setPro("");
    setCon("");
    setVerdict("");
    try {
      const response = await fetch("/api/arena", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          provider: localStorage.getItem("walter-provider") || undefined,
        }),
      });
      if (!response.ok || !response.body) {
        const data = await response.json().catch(() => ({}));
        setError(data.message || "The arena could not start");
        return;
      }
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let raw = "";
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        raw += decoder.decode(value, { stream: true });
        const parts = splitDebate(raw);
        setPro(parts.pro);
        setCon(parts.con);
      }
      raw += decoder.decode();
      const parts = splitDebate(raw);
      setPro(parts.pro);
      setCon(parts.con);
    } finally {
      setBusy(false);
    }
  };

  const judge = async () => {
    setBusy(true);
    setError("");
    try {
      const response = await fetch("/api/arena/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, pro, con }),
      });
      const data = await response.json();
      if (!response.ok) {
        setError(data.message || "The judge declined");
        return;
      }
      setVerdict(data.verdict);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <TopBar title={<span className="font-medium">Arena</span>} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto max-w-5xl">
          <h2 className="font-display text-5xl italic tracking-tight">Pick a fight.</h2>
          <p className="mt-2 mb-6 max-w-lg text-sm text-[var(--mute)]">
            Two sides argue in real time. When both have spoken, ask a judge.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row">
            <input
              value={topic}
              onChange={(event) => setTopic(event.target.value)}
              className="flex-1 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none"
            />
            <button
              type="button"
              disabled={busy || !topic.trim()}
              onClick={() => void debate()}
              className="rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-medium text-[var(--lime-ink)] disabled:opacity-40"
            >
              {busy && !pro ? "Opening…" : "Start debate"}
            </button>
          </div>
          {error && <p className="mt-3 text-sm text-red-300">{error}</p>}

          <div className="mt-6 grid gap-4 md:grid-cols-2">
            <section className="min-h-72 rounded-[24px] border border-white/8 bg-[#17171a] p-6">
              <p className="font-display text-2xl italic text-[var(--lime)]">For</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                {pro || "The affirmative case streams here."}
              </p>
            </section>
            <section className="min-h-72 rounded-[24px] border border-white/8 bg-[#17171a] p-6">
              <p className="font-display text-2xl italic text-[#ffb4a2]">Against</p>
              <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-white/85">
                {con || "The opposing case streams here."}
              </p>
            </section>
          </div>

          {pro && con && (
            <div className="mt-5">
              <button
                type="button"
                disabled={busy}
                onClick={() => void judge()}
                className="rounded-full border border-white/15 px-4 py-2 text-sm"
              >
                Ask a judge
              </button>
              {verdict && (
                <article className="mt-4 rounded-2xl border border-white/10 bg-white/[0.03] p-5 text-sm whitespace-pre-wrap">
                  {verdict}
                </article>
              )}
            </div>
          )}
        </div>
      </div>
    </AppShell>
  );
}
