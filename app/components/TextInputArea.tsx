"use client";

import React, { useEffect, useRef, useState } from "react";
import { Loader2, Mic, Plus, SendHorizonal, Square, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { sendMessage } from "../utils/useChat";

interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date | null;
}

interface PinnedDoc {
  id: string;
  fileName: string;
}

interface TextInputAreaProps {
  chatId: string | null | undefined;
  onMessageSent?: (message: ChatMessage) => void;
  onStreamStart?: () => void;
  onStreamChunk?: (chunk: string) => void;
  onStreamComplete?: (fullText: string) => void;
  onStreamError?: (err: Error) => void;
}

const MAX_HEIGHT = 200;

type SpeechRecognitionCtor = new () => {
  lang: string;
  interimResults: boolean;
  onresult: ((event: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
  stop: () => void;
};

export default function TextInputArea({
  chatId,
  onMessageSent,
  onStreamStart,
  onStreamChunk,
  onStreamComplete,
  onStreamError,
}: TextInputAreaProps) {
  const [inputValue, setInputValue] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [docs, setDocs] = useState<PinnedDoc[]>([]);
  const [uploading, setUploading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const abortRef = useRef<AbortController | null>(null);
  const router = useRouter();

  const loadDocs = async () => {
    const response = await fetch("/api/documents");
    if (!response.ok) return;
    const data = await response.json();
    const pinned = (data.documents ?? []).filter((doc: PinnedDoc & { pinned?: boolean }) => doc.pinned);
    setDocs(pinned.map((doc: PinnedDoc) => ({ id: doc.id, fileName: doc.fileName })));
  };

  useEffect(() => {
    void loadDocs();
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<string>).detail;
      if (typeof detail === "string") {
        setInputValue(detail);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener("pptchat:fill-input", handler);
    window.addEventListener("pptchat:docs-changed", loadDocs);
    return () => {
      window.removeEventListener("pptchat:fill-input", handler);
      window.removeEventListener("pptchat:docs-changed", loadDocs);
    };
  }, []);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const next = Math.min(el.scrollHeight, MAX_HEIGHT);
    el.style.height = `${next}px`;
    el.style.overflowY = el.scrollHeight > MAX_HEIGHT ? "auto" : "hidden";
  }, [inputValue]);

  useEffect(() => {
    textareaRef.current?.focus();
  }, [chatId]);

  const unpin = async (id: string) => {
    setDocs((prev) => prev.filter((doc) => doc.id !== id));
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, pinned: false }),
    });
    window.dispatchEvent(new Event("pptchat:docs-changed"));
  };

  const upload = async (file: File) => {
    setUploadError("");
    setUploading(true);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch("/api/upload/files", { method: "POST", body: form });
      const data = await response.json();
      if (!response.ok) {
        setUploadError(data.message || "Upload failed");
        return;
      }
      setDocs((prev) => [
        { id: data.document.id, fileName: data.document.fileName },
        ...prev.filter((doc) => doc.id !== data.document.id),
      ]);
      window.dispatchEvent(new Event("pptchat:docs-changed"));
    } catch {
      setUploadError("Upload failed");
    } finally {
      setUploading(false);
    }
  };

  const toggleMic = () => {
    const Ctor = (
      window as Window & {
        SpeechRecognition?: SpeechRecognitionCtor;
        webkitSpeechRecognition?: SpeechRecognitionCtor;
      }
    ).SpeechRecognition ||
      (window as Window & { webkitSpeechRecognition?: SpeechRecognitionCtor })
        .webkitSpeechRecognition;

    if (!Ctor) {
      setUploadError("Voice input works in Chrome and Edge.");
      return;
    }

    const recognition = new Ctor();
    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? "";
      setInputValue((prev) => (prev ? `${prev} ${transcript}` : transcript));
    };
    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
    setIsListening(true);
    recognition.start();
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isSending) return;

    const tempMessage = {
      id: crypto.randomUUID(),
      content: inputValue,
      role: "user" as const,
      createdAt: new Date(),
    };
    onMessageSent?.(tempMessage);

    const currentInput = inputValue;
    const documentIds = docs.map((doc) => doc.id);
    setInputValue("");
    setIsSending(true);
    onStreamStart?.();

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const result = await sendMessage(chatId, currentInput, {
        documentIds,
        signal: controller.signal,
        onChunk: (chunk) => onStreamChunk?.(chunk),
        onComplete: (full) => onStreamComplete?.(full),
        onError: (err) => onStreamError?.(err),
      });
      if (result?.chatId && chatId !== result.chatId) {
        router.push(`/chat/${result.chatId}`);
      }
    } catch (error) {
      onStreamError?.(error instanceof Error ? error : new Error("Failed to send message"));
    } finally {
      abortRef.current = null;
      setIsSending(false);
    }
  };

  return (
    <div className="mx-auto w-full max-w-3xl px-4 pb-4 pt-2">
      {docs.length > 0 && (
        <div className="mb-2 flex flex-wrap gap-2">
          {docs.map((doc) => (
            <span
              key={doc.id}
              className="inline-flex max-w-full items-center gap-1.5 rounded-full border border-white/10 bg-white/6 px-3 py-1 text-xs text-[var(--cream)]"
            >
              <span className="truncate">{doc.fileName}</span>
              <button type="button" onClick={() => unpin(doc.id)} aria-label={`Unpin ${doc.fileName}`}>
                <X className="h-3 w-3 text-white/50" />
              </button>
            </span>
          ))}
        </div>
      )}
      <div
        className={`rounded-[28px] border bg-[#1b1b1f] px-2 py-2 shadow-[0_18px_50px_rgba(0,0,0,0.35)] transition-colors ${
          isFocused ? "border-white/18" : "border-white/10"
        }`}
      >
        <textarea
          ref={textareaRef}
          value={inputValue}
          onChange={(event) => setInputValue(event.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              void handleSend();
            }
          }}
          placeholder={docs.length ? "Ask about the pinned files" : "Ask anything"}
          rows={1}
          className="max-h-[200px] w-full resize-none bg-transparent px-3 py-2 text-[15px] leading-relaxed text-[var(--cream)] outline-none placeholder:text-white/30"
        />
        <div className="flex items-center justify-between px-1 pb-0.5">
          <div className="flex items-center">
            <input
              ref={fileRef}
              type="file"
              hidden
              accept=".pdf,.docx,.txt,.md,.csv,.json,text/plain"
              onChange={(event) => {
                const file = event.target.files?.[0];
                if (file) void upload(file);
                event.target.value = "";
              }}
            />
            <button
              type="button"
              aria-label="Attach files"
              onClick={() => fileRef.current?.click()}
              className="grid h-9 w-9 place-items-center rounded-full text-white/55 hover:bg-white/8 hover:text-[var(--cream)]"
            >
              {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            </button>
            <button
              type="button"
              aria-label="Voice input"
              onClick={toggleMic}
              className={`grid h-9 w-9 place-items-center rounded-full ${
                isListening
                  ? "bg-red-500/15 text-red-300"
                  : "text-white/55 hover:bg-white/8 hover:text-[var(--cream)]"
              }`}
            >
              <Mic className="h-4 w-4" />
            </button>
          </div>
          {isSending ? (
            <button
              type="button"
              aria-label="Stop generating"
              onClick={() => abortRef.current?.abort()}
              className="grid h-9 w-9 place-items-center rounded-full bg-[var(--cream)] text-black"
            >
              <Square className="h-3.5 w-3.5 fill-current" />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={!inputValue.trim()}
              aria-label="Send message"
              className={`grid h-9 w-9 place-items-center rounded-full transition-colors ${
                inputValue.trim()
                  ? "bg-[var(--lime)] text-[var(--lime-ink)]"
                  : "bg-white/6 text-white/25"
              }`}
            >
              <SendHorizonal className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>
      {uploadError && <p className="mt-2 text-center text-xs text-red-300">{uploadError}</p>}
    </div>
  );
}
