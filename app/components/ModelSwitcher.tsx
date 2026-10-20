"use client";

import { useEffect, useState } from "react";
import { ChevronDown } from "lucide-react";

const OPTIONS = [
  { id: "groq", label: "Groq", hint: "Fast" },
  { id: "gemini", label: "Gemini", hint: "Google" },
  { id: "ollama", label: "Local", hint: "Ollama" },
] as const;

export default function ModelSwitcher() {
  const [provider, setProvider] = useState<(typeof OPTIONS)[number]["id"]>("groq");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("walter-provider");
    const match = OPTIONS.find((option) => option.id === saved);
    if (match) setProvider(match.id);
  }, []);

  const choose = (id: (typeof OPTIONS)[number]["id"]) => {
    setProvider(id);
    localStorage.setItem("walter-provider", id);
    setOpen(false);
  };

  const current = OPTIONS.find((option) => option.id === provider) ?? OPTIONS[0];

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 py-1.5 pl-3 pr-2 text-sm hover:bg-white/8"
      >
        <span className="h-1.5 w-1.5 rounded-full bg-[var(--lime)]" />
        <span className="font-medium">{current.label}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-white/45 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute left-0 z-20 mt-2 w-44 overflow-hidden rounded-2xl border border-white/10 bg-[#1c1c20] p-1 shadow-2xl">
            {OPTIONS.map((option) => (
              <button
                key={option.id}
                type="button"
                onClick={() => choose(option.id)}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm hover:bg-white/6 ${
                  option.id === provider ? "text-[var(--cream)]" : "text-white/70"
                }`}
              >
                {option.label}
                <span className="text-[11px] text-white/35">{option.hint}</span>
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
