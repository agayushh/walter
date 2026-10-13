"use client";

import { FileText, Mic, PenLine, Swords } from "lucide-react";
import Link from "next/link";
import AppShell from "@/app/components/AppShell";
import ModelSwitcher from "@/app/components/ModelSwitcher";
import TopBar from "@/app/components/TopBar";
import NewChatClient from "./NewChatClient";

const suggestions = [
  {
    label: "Write or edit",
    hint: "Draft, rewrite, tighten",
    icon: PenLine,
    prompt: "Help me write ",
  },
  {
    label: "Work from a file",
    hint: "Summarize what I attach",
    icon: FileText,
    prompt: "Summarize the document I attach and list the three most important points.",
  },
];

export default function Page() {
  const fill = (prompt: string) => {
    window.dispatchEvent(new CustomEvent("pptchat:fill-input", { detail: prompt }));
  };

  return (
    <AppShell>
      <TopBar title={<ModelSwitcher />} />
      <NewChatClient>
        {suggestions.map((item) => (
          <button
            key={item.label}
            type="button"
            onClick={() => fill(item.prompt)}
            className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left transition-colors hover:bg-white/[0.06]"
          >
            <item.icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lime)]" />
            <span>
              <span className="block text-sm text-[var(--cream)]">{item.label}</span>
              <span className="mt-0.5 block text-xs text-[var(--mute)]">{item.hint}</span>
            </span>
          </button>
        ))}
        <Link
          href="/interview"
          className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
        >
          <Mic className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lime)]" />
          <span>
            <span className="block text-sm">Interview booth</span>
            <span className="mt-0.5 block text-xs text-[var(--mute)]">Five questions, then a score</span>
          </span>
        </Link>
        <Link
          href="/arena"
          className="flex items-start gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 transition-colors hover:bg-white/[0.06]"
        >
          <Swords className="mt-0.5 h-4 w-4 shrink-0 text-[var(--lime)]" />
          <span>
            <span className="block text-sm">Debate arena</span>
            <span className="mt-0.5 block text-xs text-[var(--mute)]">Two sides, then a judge</span>
          </span>
        </Link>
      </NewChatClient>
    </AppShell>
  );
}
