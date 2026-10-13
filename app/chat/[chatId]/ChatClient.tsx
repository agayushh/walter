"use client";

import { useEffect, useRef } from "react";
import { Download } from "lucide-react";
import TextInputArea from "@/app/components/TextInputArea";
import MessageBubble from "@/app/components/MessageBubble";
import ModelSwitcher from "@/app/components/ModelSwitcher";
import TopBar from "@/app/components/TopBar";
import { useChatStream, type ChatMessage } from "@/app/components/useChatStream";

interface ChatClientProps {
  initialMessages: ChatMessage[];
  chatId: string;
}

export default function ChatClient({ initialMessages, chatId }: ChatClientProps) {
  const stream = useChatStream(initialMessages, chatId);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stream.messages]);

  const lastAssistantId = [...stream.messages]
    .reverse()
    .find((message) => message.role === "assistant")?.id;

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <TopBar
        title={<ModelSwitcher />}
        children={
          <button
            type="button"
            onClick={stream.exportMarkdown}
            className="grid h-8 w-8 place-items-center rounded-full text-white/50 hover:bg-white/8 hover:text-[var(--cream)]"
            aria-label="Export chat"
          >
            <Download className="h-4 w-4" />
          </button>
        }
      />

      <div className="mx-auto w-full max-w-3xl flex-1 space-y-7 overflow-y-auto px-4 py-6 pb-40">
        {stream.messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-sm text-[var(--mute)]">
            No messages yet. Send a prompt to start the conversation.
          </div>
        ) : (
          stream.messages.map((message) => (
            <MessageBubble
              key={message.id}
              id={message.id}
              role={message.role}
              content={message.content}
              onRegenerate={
                message.role === "assistant" && message.id === lastAssistantId
                  ? stream.regenerate
                  : undefined
              }
            />
          ))
        )}
        <div ref={endRef} />
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--stage)] via-[var(--stage)] to-transparent pt-6">
      <TextInputArea
        chatId={chatId}
        onMessageSent={stream.handleUserMessageSent}
        onStreamStart={stream.handleStreamStart}
        onStreamChunk={stream.handleStreamChunk}
        onStreamComplete={stream.handleStreamComplete}
        onStreamError={stream.handleStreamError}
      />
      </div>
    </div>
  );
}
