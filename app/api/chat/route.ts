import { streamText, type CoreMessage } from "ai";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import {
  chatsTable,
  documentsTable,
  messagesTable,
} from "@/db/schema/schema";
import { getModel } from "@/app/lib/llm/provider";
import { extractMemories, recallMemories } from "@/app/lib/memory";
import { relevantExcerpt } from "@/app/lib/documents/excerpt";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  const { dbUser } = authResult;

  let body: {
    chatId?: string;
    content?: string;
    provider?: string;
    regenerate?: boolean;
    documentIds?: string[];
  };
  try {
    body = await request.json();
  } catch {
    return jsonError(400, "Invalid JSON body");
  }

  const { chatId, regenerate } = body;
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!chatId || typeof chatId !== "string") {
    return jsonError(400, "chatId is required");
  }
  if (!regenerate && !content) {
    return jsonError(400, "content is required");
  }

  await ensureExtras();

  const [chat] = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, dbUser.id)))
    .limit(1);

  if (!chat) {
    return jsonError(404, "Chat not found");
  }

  const history = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId))
    .orderBy(asc(messagesTable.createdAt));

  const promptHistory: { role: "user" | "assistant"; content: string }[] = history
    .filter((message) => message.role === "user" || message.role === "assistant")
    .filter((message) => message.content?.trim())
    .map((message) => ({
      role: message.role as "user" | "assistant",
      content: message.content,
    }));

  if (regenerate) {
    while (promptHistory.length && promptHistory.at(-1)?.role === "assistant") {
      promptHistory.pop();
    }
  }

  const latestUser =
    content ||
    [...promptHistory].reverse().find((message) => message.role === "user")
      ?.content ||
    "";
  if (!latestUser.trim()) {
    return jsonError(400, "Nothing to respond to");
  }

  const last = promptHistory.at(-1);
  if (!(last?.role === "user" && last.content === latestUser)) {
    promptHistory.push({ role: "user", content: latestUser });
  }

  const [memories, excerpt] = await Promise.all([
    recallMemories(dbUser.id).catch(() => [] as string[]),
    loadDocumentContext(dbUser.id, body.documentIds, latestUser),
  ]);

  const system = [
    "You are pptChat, a sharp AI assistant. Be concrete, use markdown when it helps, and do not invent citations.",
    memories.length
      ? `What you remember about this user:\n${memories.map((fact) => `- ${fact}`).join("\n")}`
      : "",
    excerpt
      ? `The user attached documents. Prefer these excerpts when they are relevant, and say when the documents do not contain the answer.\n\n${excerpt}`
      : "",
  ]
    .filter(Boolean)
    .join("\n\n");

  const messages: CoreMessage[] = [
    { role: "system", content: system },
    ...promptHistory.map<CoreMessage>((message) => ({
      role: message.role,
      content: message.content,
    })),
  ];

  if (!chat.title || chat.title === "New Chat" || chat.title.startsWith("New Chat ")) {
    const title = latestUser.replace(/\s+/g, " ").slice(0, 60);
    await db
      .update(chatsTable)
      .set({ title, updatedAt: new Date() })
      .where(eq(chatsTable.id, chatId));
  } else {
    await db
      .update(chatsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatsTable.id, chatId));
  }

  let assistantRowId: string;
  try {
    const [inserted] = await db
      .insert(messagesTable)
      .values({
        chatId,
        role: "assistant",
        content: "",
        messageStatus: "pending",
      })
      .returning({ id: messagesTable.id });
    assistantRowId = inserted.id;
  } catch (error) {
    console.error("[chat] failed to insert pending assistant row", error);
    return jsonError(500, "Failed to initialize assistant reply");
  }

  try {
    const result = streamText({
      model: getModel(body.provider),
      messages,
      async onFinish({ text }) {
        await db
          .update(messagesTable)
          .set({
            content: text,
            messageStatus: "success",
            updatedAt: new Date(),
          })
          .where(eq(messagesTable.id, assistantRowId));
        void extractMemories(dbUser.id, latestUser, text).catch((error) => {
          console.error("[memory] extract failed", error);
        });
      },
      async onError({ error }) {
        console.error("[chat] stream error", error);
        await db
          .update(messagesTable)
          .set({ messageStatus: "error", updatedAt: new Date() })
          .where(eq(messagesTable.id, assistantRowId))
          .catch(() => {});
      },
    });

    const response = result.toTextStreamResponse();
    response.headers.set("x-assistant-message-id", assistantRowId);
    response.headers.set("x-chat-id", chatId);
    return response;
  } catch (error) {
    console.error("[chat] failed to start stream", error);
    await db
      .update(messagesTable)
      .set({ messageStatus: "error", updatedAt: new Date() })
      .where(eq(messagesTable.id, assistantRowId))
      .catch(() => {});
    return jsonError(500, "LLM request failed");
  }
}

async function loadDocumentContext(
  userId: string,
  documentIds: string[] | undefined,
  query: string,
) {
  const ids = (documentIds ?? []).filter(
    (id) => typeof id === "string" && UUID.test(id),
  );
  const pinned = await db
    .select()
    .from(documentsTable)
    .where(and(eq(documentsTable.userId, userId), eq(documentsTable.pinned, true)))
    .orderBy(desc(documentsTable.createdAt))
    .limit(4);

  let selected = pinned;
  if (ids.length) {
    const explicit = await db
      .select()
      .from(documentsTable)
      .where(
        and(eq(documentsTable.userId, userId), inArray(documentsTable.id, ids.slice(0, 4))),
      );
    const merged = new Map<string, (typeof pinned)[number]>();
    for (const doc of [...explicit, ...pinned]) merged.set(doc.id, doc);
    selected = [...merged.values()];
  }

  if (!selected.length) return "";
  return relevantExcerpt(
    selected.map((doc) => ({ fileName: doc.fileName, content: doc.content })),
    query,
  );
}

function jsonError(status: number, message: string) {
  return new Response(JSON.stringify({ message }), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
