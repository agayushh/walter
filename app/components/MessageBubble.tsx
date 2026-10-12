"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { Check, Copy, RefreshCw, Volume2 } from "lucide-react";

interface MessageBubbleProps {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  streaming?: boolean;
  onRegenerate?: () => void;
}

export default function MessageBubble({
  id,
  role,
  content,
  onRegenerate,
}: MessageBubbleProps) {
  const [copied, setCopied] = useState(false);
  const isUser = role === "user";
  const streaming = id.startsWith("streaming-");

  const copy = async () => {
    await navigator.clipboard.writeText(content);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1200);
  };

  const speak = () => {
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(content.slice(0, 4000));
    utterance.rate = 1.02;
    window.speechSynthesis.speak(utterance);
  };

  return (
    <div className={`group flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div className={`max-w-[min(100%,42rem)] ${isUser ? "max-w-[80%]" : "w-full"}`}>
        {isUser ? (
          <div className="rounded-[22px] rounded-br-md bg-[#2a2a2e] px-4 py-2.5 text-[15px] leading-relaxed whitespace-pre-wrap">
            {content}
          </div>
        ) : (
          <div className="prose-chat px-1 text-[15.5px] leading-7 text-[var(--cream)]">
            {content ? <ReactMarkdown>{content}</ReactMarkdown> : null}
            {streaming && (
              <span className="ml-0.5 inline-block h-4 w-[7px] translate-y-[2px] rounded-sm bg-[var(--lime)] animate-pulse" />
            )}
          </div>
        )}
        {!isUser && content && !streaming && (
          <div className="mt-1 flex items-center gap-0.5 px-1 text-white/35 opacity-0 transition-opacity group-hover:opacity-100">
            <IconButton label="Copy message" onClick={copy}>
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            </IconButton>
            <IconButton label="Read aloud" onClick={speak}>
              <Volume2 className="h-3.5 w-3.5" />
            </IconButton>
            {onRegenerate && (
              <IconButton label="Regenerate" onClick={onRegenerate}>
                <RefreshCw className="h-3.5 w-3.5" />
              </IconButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function IconButton({
  children,
  label,
  onClick,
}: {
  children: React.ReactNode;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid h-7 w-7 place-items-center rounded-lg hover:bg-white/8 hover:text-[var(--cream)]"
    >
      {children}
    </button>
  );
}
