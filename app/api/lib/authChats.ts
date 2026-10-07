import { auth } from "@clerk/nextjs/server";
import { getAuthenticatedUser } from "./cacheUser";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { chatsTable } from "@/db/schema/schema";
import { and, eq } from "drizzle-orm";

export async function getAuthorizedChats({params}: {params: Promise<{ chatId: string }>}) {
  const user = await auth();
  if (!user.userId) {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }
  const dbUser = await getAuthenticatedUser(user.userId);
  if (!dbUser) {
    return NextResponse.json(
      {
        message: "User not found",
      },
      {
        status: 404,
      },
    );
  }
  const chats = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.id, (await params).chatId), eq(chatsTable.userId, dbUser.id)))
    .limit(1);
  if (!chats || chats.length === 0) {
    return NextResponse.json(
      {
        message: "Chat not found",
      },
      {
        status: 404,
      },
    );
  }
  return chats;
}


