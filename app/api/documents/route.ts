import { and, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import { documentsTable } from "@/db/schema/schema";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const dynamic = "force-dynamic";

export async function GET() {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const rows = await db
    .select({
      id: documentsTable.id,
      fileName: documentsTable.fileName,
      pinned: documentsTable.pinned,
      content: documentsTable.content,
      createdAt: documentsTable.createdAt,
    })
    .from(documentsTable)
    .where(eq(documentsTable.userId, authResult.dbUser.id))
    .orderBy(desc(documentsTable.createdAt))
    .limit(20);

  const documents = rows.map((row) => ({
    id: row.id,
    fileName: row.fileName,
    pinned: row.pinned,
    createdAt: row.createdAt,
    excerpt: row.content.slice(0, 180),
  }));

  return NextResponse.json({ documents });
}

export async function PATCH(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string" || typeof body.pinned !== "boolean") {
    return NextResponse.json({ message: "id and pinned are required" }, { status: 400 });
  }

  await db
    .update(documentsTable)
    .set({ pinned: body.pinned })
    .where(
      and(eq(documentsTable.id, body.id), eq(documentsTable.userId, authResult.dbUser.id)),
    );

  return NextResponse.json({ message: "Updated" });
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
    .delete(documentsTable)
    .where(and(eq(documentsTable.id, id), eq(documentsTable.userId, authResult.dbUser.id)));

  return NextResponse.json({ message: "Deleted" });
}
