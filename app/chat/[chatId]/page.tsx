import { auth } from "@clerk/nextjs/server";
import { and, asc, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import AppShell from "@/app/components/AppShell";
import { getAuthenticatedUser } from "@/app/api/lib/cacheUser";
import { db } from "@/db";
import { chatsTable, messagesTable } from "@/db/schema/schema";
import ChatClient from "./ChatClient";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: Promise<{ chatId: string }>;
}) {
  const { chatId } = await params;
  const { userId } = await auth();
  if (!userId) redirect("/sign-in");

  const dbUser = await getAuthenticatedUser(userId);
  if (!dbUser) redirect("/sign-in");

  const [chat] = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.id, chatId), eq(chatsTable.userId, dbUser.id)))
    .limit(1);

  if (!chat) redirect("/chat");

  const messages = await db
    .select()
    .from(messagesTable)
    .where(eq(messagesTable.chatId, chatId))
    .orderBy(asc(messagesTable.createdAt));

  const visible = messages.filter(
    (message) =>
      message.role !== "assistant" ||
      Boolean(message.content?.trim()) ||
      message.messageStatus === "error",
  );

  return (
    <AppShell>
      <ChatClient key={chatId} initialMessages={visible} chatId={chatId} />
    </AppShell>
  );
}
