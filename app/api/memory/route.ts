import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import { memoriesTable } from "@/db/schema/schema";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const memories = await db
    .select({
      id: memoriesTable.id,
      content: memoriesTable.content,
      createdAt: memoriesTable.createdAt,
    })
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, authResult.dbUser.id))
    .orderBy(desc(memoriesTable.createdAt))
    .limit(50);

  return NextResponse.json({ memories });
}

export async function POST(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const body = await request.json().catch(() => ({}));
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!content || content.length > 280) {
    return NextResponse.json(
      { message: "Memory must be 1–280 characters" },
      { status: 400 },
    );
  }

  const [memory] = await db
    .insert(memoriesTable)
    .values({ userId: authResult.dbUser.id, content })
    .returning({
      id: memoriesTable.id,
      content: memoriesTable.content,
      createdAt: memoriesTable.createdAt,
    });

  return NextResponse.json({ memory }, { status: 201 });
}

export async function DELETE(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  await db
    .delete(memoriesTable)
    .where(and(eq(memoriesTable.id, id), eq(memoriesTable.userId, authResult.dbUser.id)));

  return NextResponse.json({ message: "Deleted" });
}
