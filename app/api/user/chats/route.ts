import { db } from "@/db";
import { chatsTable } from "@/db/schema/schema";
import { auth } from "@clerk/nextjs/server";
import { and, desc, eq, isNull } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { getAuthenticatedUser } from "../../lib/cacheUser";

export async function GET() {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json(
      {
        message: "Unauthorized",
      },
      {
        status: 401,
      },
    );
  }

  const dbUser = await getAuthenticatedUser(userId);

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
  try {
  const allChats = await db
    .select()
    .from(chatsTable)
    .where(and(eq(chatsTable.userId, dbUser.id), isNull(chatsTable.deletedAt)))
    .orderBy(desc(chatsTable.updatedAt));
    return NextResponse.json(
      {
        message: "Chats fetched successfully",
        chats: allChats,
      },
      {
        status: 200,
      },
    );
  } catch (error) {
    return NextResponse.json(
      {
        message: "Error while fetching chats",
        error: error,
      },
      {
        status: 500,
      },
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { title } = await request.json();
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        {
          message: "Unauthorized",
        },
        {
          status: 401,
        },
      );
    }
    const dbUser = await getAuthenticatedUser(userId);
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
    const chat = await db.insert(chatsTable).values({
      userId: dbUser.id,
      title: title,
    }).returning(); 
    return NextResponse.json(
      {
        message: "Chat created successfully",
        chat: chat,
      },
      {
        status: 200,
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
