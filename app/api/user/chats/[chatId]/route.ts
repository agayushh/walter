import { getAuthorizedChats } from "@/app/api/lib/authChats";
import { db } from "@/db";
import { chatsTable, messagesTable } from "@/db/schema/schema";
import { asc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const chat = await getAuthorizedChats({params});
    if (chat instanceof NextResponse) {
      return chat;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.chatId, (await params).chatId))
      .orderBy(asc(messagesTable.createdAt));

    return NextResponse.json(
      {
        message: "Messages fetched successfully",
        messages: messages,
      },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error while fetching messages", error: error },
      { status: 500 },
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const { title } = await request.json();
    const chat = await getAuthorizedChats({params});
    if (chat instanceof NextResponse) {
      return chat;
    }

    const updated = await db
      .update(chatsTable)
      .set({ title: title })
      .where(eq(chatsTable.id, (await params).chatId));

    return NextResponse.json(
      { message: "Title updated successfully", chat: updated },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      { message: "Error while updating chat", error: error },
      { status: 500 },
    );
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const chat = await getAuthorizedChats({ params });
    if (chat instanceof NextResponse) {
      return chat;
    }
    await db.delete(chatsTable).where(eq(chatsTable.id, (await params).chatId));
    return NextResponse.json({ message: "Chat deleted" }, { status: 200 });
  } catch (error) {
    return NextResponse.json(
      { message: "Error while deleting chat", error },
      { status: 500 },
    );
  }
}