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
    const chat = await getAuthorizedChats({ params });
    if (chat instanceof NextResponse) {
      return chat;
    }

    const messages = await db
      .select()
      .from(messagesTable)
      .where(eq(messagesTable.chatId, (await params).chatId))
      .orderBy(asc(messagesTable.createdAt));

    return NextResponse.json(
      { message: "Messages fetched successfully", messages },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error while fetching messages",
        error: error,
      },
      { status: 500 },
    );
  }
}
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const chat = await getAuthorizedChats({ params });
    if (chat instanceof NextResponse) {
      return chat;
    }
    const { messageId, newContent } = await request.json();
    const updatedMessage = await db
      .update(messagesTable)
      .set({ content: newContent })
      .where(eq(messagesTable.id, messageId));
    return NextResponse.json(
      { message: "Message updated successfully", updatedMessage },
      { status: 200 },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error while updating message",
        error: error,
      },
      { status: 500 },
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ chatId: string }> },
) {
  try {
    const chat = await getAuthorizedChats({ params });
    if (chat instanceof NextResponse) {
      return chat;
    }
    const { content, message, messages, role } = await request.json();
    const updateMessageArray = await db
      .insert(messagesTable)
      .values({
        content: content || message || messages,
        role: role,
        chatId: (await params).chatId,
      })
      .returning();

    await db
      .update(chatsTable)
      .set({ updatedAt: new Date() })
      .where(eq(chatsTable.id, (await params).chatId));

    return NextResponse.json(
      {
        message: "Message created successfully",
        newMessage: updateMessageArray[0],
      },
      {
        status: 201,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error while creating chat",
        error: error,
      },
      {
        status: 500,
      },
    );
  }
}
