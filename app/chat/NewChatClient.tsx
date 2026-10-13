"use client";

import { useEffect, useRef } from "react";
import TextInputArea from "@/app/components/TextInputArea";
import MessageBubble from "@/app/components/MessageBubble";
import { useChatStream } from "@/app/components/useChatStream";

interface NewChatClientProps {
  children?: React.ReactNode;
}

export default function NewChatClient({ children }: NewChatClientProps) {
  const stream = useChatStream([], null);
  const endRef = useRef<HTMLDivElement>(null);
  const hasMessages = stream.messages.length > 0;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [stream.messages]);

  return (
    <div className="relative flex h-full min-h-0 flex-1 flex-col">
      <div className="mx-auto flex w-full max-w-3xl flex-1 flex-col overflow-hidden px-4 pb-36">
        {hasMessages ? (
          <div className="flex-1 space-y-7 overflow-y-auto py-6">
            {stream.messages.map((message) => (
              <MessageBubble
                key={message.id}
                id={message.id}
                role={message.role}
                content={message.content}
              />
            ))}
            <div ref={endRef} />
          </div>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center pb-10">
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--lime)]">pptChat</p>
            <h1 className="font-display mt-3 text-center text-5xl italic leading-none tracking-tight sm:text-6xl">
              Where should we begin?
            </h1>
            <p className="mt-4 max-w-md text-center text-sm text-[var(--mute)]">
              Ask a question, pin a document, or open the interview booth and debate arena.
            </p>
            <div className="mt-8 grid w-full max-w-xl grid-cols-1 gap-2 sm:grid-cols-2">
              {children}
            </div>
          </div>
        )}
      </div>

      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-[var(--stage)] via-[var(--stage)] to-transparent pt-8">
        <TextInputArea
          chatId={null}
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
