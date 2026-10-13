"use client";

import { useCallback, useRef, useState } from "react";
import { sendMessage } from "@/app/utils/useChat";

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  createdAt: Date | null;
}

export function useChatStream(initialMessages: ChatMessage[], chatId: string | null) {
  const [messages, setMessages] = useState<ChatMessage[]>(initialMessages);
  const messagesRef = useRef(messages);
  messagesRef.current = messages;
  const chatIdRef = useRef(chatId);
  chatIdRef.current = chatId;

  const handleUserMessageSent = useCallback((newMessage: ChatMessage) => {
    setMessages((prev) => [...prev, newMessage]);
  }, []);

  const handleStreamStart = useCallback(() => {
    setMessages((prev) => [
      ...prev,
      {
        id: `streaming-${crypto.randomUUID()}`,
        role: "assistant",
        content: "",
        createdAt: new Date(),
      },
    ]);
  }, []);

  const handleStreamChunk = useCallback((chunk: string) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (last.role !== "assistant" || !last.id.startsWith("streaming-")) {
        return [
          ...prev,
          {
            id: `streaming-${crypto.randomUUID()}`,
            role: "assistant",
            content: chunk,
            createdAt: new Date(),
          },
        ];
      }
      return [...prev.slice(0, -1), { ...last, content: last.content + chunk }];
    });
  }, []);

  const handleStreamComplete = useCallback(() => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (!last.id.startsWith("streaming-")) return prev;
      return [
        ...prev.slice(0, -1),
        { ...last, id: `assistant-${crypto.randomUUID()}` },
      ];
    });
  }, []);

  const handleStreamError = useCallback((err: Error) => {
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const last = prev[prev.length - 1];
      if (!last.id.startsWith("streaming-")) return prev;
      return [
        ...prev.slice(0, -1),
        {
          ...last,
          id: `assistant-${crypto.randomUUID()}`,
          content:
            last.content ||
            err.message ||
            "Something went wrong while generating a response.",
        },
      ];
    });
  }, []);

  const regenerate = useCallback(async () => {
    const lastUser = [...messagesRef.current]
      .reverse()
      .find((message) => message.role === "user");
    if (!lastUser) return;
    handleStreamStart();
    try {
      await sendMessage(chatIdRef.current, lastUser.content, {
        regenerate: true,
        onChunk: handleStreamChunk,
        onComplete: handleStreamComplete,
        onError: handleStreamError,
      });
    } catch (error) {
      handleStreamError(
        error instanceof Error ? error : new Error("Failed to regenerate"),
      );
    }
  }, [handleStreamChunk, handleStreamComplete, handleStreamError, handleStreamStart]);

  const exportMarkdown = useCallback(() => {
    const markdown = messagesRef.current
      .map((message) => `### ${message.role}\n\n${message.content}`)
      .join("\n\n");
    const blob = new Blob([markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = "pptchat.md";
    anchor.click();
    URL.revokeObjectURL(url);
  }, []);

  return {
    messages,
    handleUserMessageSent,
    handleStreamStart,
    handleStreamChunk,
    handleStreamComplete,
    handleStreamError,
    regenerate,
    exportMarkdown,
  };
}
