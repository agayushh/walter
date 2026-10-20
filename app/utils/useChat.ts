import axios, { AxiosResponse } from "axios";

const handleApiRequest = async <T>(
  request: () => Promise<AxiosResponse<T>>,
  fallbackError: string,
): Promise<T> => {
  try {
    const response = await request();
    if (response.status === 200 || response.status === 201) {
      return response.data;
    } else {
      throw new Error(fallbackError);
    }
  } catch (error) {
    if (error instanceof Error) {
      throw new Error(error?.message);
    } else {
      throw new Error("Something went wrong! while loading the chats");
    }
  }
};

export const getAllTheChats = async () => {
  const data = await handleApiRequest(
    () => axios.get("/api/user/chats"),
    "Failed to load chats",
  );
  return data;
};

export const createNewChat = async () => {
  const data = await handleApiRequest(
    () => axios.post("/api/user/chats", { title: "New Chat" }),
    "Failed to create chat",
  );
  return data;
};

export const renameChatTitle = async (chatId: string, title: string) => {
  const data = await handleApiRequest(
    () => axios.put(`/api/user/chats/${chatId}`, { title }),
    "Failed to update chat",
  );
  return data;
};

export const deleteChat = async (chatId: string) => {
  const data = await handleApiRequest(
    () => axios.delete(`/api/user/chats/${chatId}`),
    "Failed to delete chat",
  );
  return data;
};

export const getSingleChat = async (chatId: string) => {
  const data = await handleApiRequest(
    () => axios.get(`/api/user/chats/${chatId}`),
    `Failed to load chat with the id: ${chatId}`,
  );
  return data;
};

export type SendMessageOptions = {
  onChunk?: (chunk: string) => void;
  onComplete?: (fullText: string) => void;
  onError?: (err: Error) => void;
  regenerate?: boolean;
  documentIds?: string[];
  signal?: AbortSignal;
};

function currentProvider() {
  if (typeof window === "undefined") return undefined;
  const value = localStorage.getItem("walter-provider");
  return value === "gemini" || value === "groq" || value === "ollama" ? value : undefined;
}

export const sendMessage = async (
  chatId: string | null | undefined,
  message: string,
  options: SendMessageOptions = {},
) => {
  try {
    let activeChatId = chatId;

    // 1. Create a new chat if it is a new session
    if (!activeChatId || activeChatId === "new") {
      const chatData = await createNewChat();
      if (chatData && chatData.chat && chatData.chat[0]) {
        activeChatId = chatData.chat[0].id;
      } else {
        throw new Error("Failed to initialize new chat");
      }
    }

    if (!options.regenerate) {
      await handleApiRequest(
        () =>
          axios.post(`/api/user/chats/${activeChatId}/messages`, {
            message,
            role: "user",
            chatId: activeChatId,
          }),
        "Failed to send message in the chat",
      );
    }

    let fullText = "";
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chatId: activeChatId,
          content: message,
          provider: currentProvider(),
          regenerate: options.regenerate ?? false,
          documentIds: options.documentIds ?? [],
        }),
        signal: options.signal,
      });

      if (!response.ok) {
        const errText = await response.text().catch(() => "");
        throw new Error(
          `Chat stream failed: ${response.status} ${response.statusText} ${errText}`,
        );
      }
      if (!response.body) {
        throw new Error("Chat stream returned no body");
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // AI SDK v5 toTextStreamResponse emits raw text (not SSE), so we just
        // forward decoded chunks as they arrive. If the protocol changes to
        // SSE later, parse here instead.
        const chunk = buffer;
        buffer = "";
        if (chunk) {
          fullText += chunk;
          options.onChunk?.(chunk);
        }
      }

      // Drain any trailing bytes
      const tail = decoder.decode();
      if (tail) {
        fullText += tail;
        options.onChunk?.(tail);
      }

      options.onComplete?.(fullText);
    } catch (streamErr) {
      if (options.signal?.aborted) {
        options.onComplete?.(fullText);
      } else {
        const err =
          streamErr instanceof Error
            ? streamErr
            : new Error("Unknown streaming error");
        console.error("Error in chat stream:", err);
        options.onError?.(err);
      }
    }

    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("pptchat:chats-changed"));
    }

    return { chatId: activeChatId };
  } catch (error) {
    console.error("Error in sendMessage:", error);
    throw error;
  }
};
