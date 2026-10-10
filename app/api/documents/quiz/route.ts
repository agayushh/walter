import { and, eq } from "drizzle-orm";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import { documentsTable } from "@/db/schema/schema";
import { getModel } from "@/app/lib/llm/provider";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const body = await request.json().catch(() => ({}));
  if (typeof body.id !== "string") {
    return NextResponse.json({ message: "id is required" }, { status: 400 });
  }

  const [doc] = await db
    .select()
    .from(documentsTable)
    .where(
      and(eq(documentsTable.id, body.id), eq(documentsTable.userId, authResult.dbUser.id)),
    )
    .limit(1);

  if (!doc) {
    return NextResponse.json({ message: "Document not found" }, { status: 404 });
  }

  const { text } = await generateText({
    model: getModel(),
    prompt:
      "Write a 5-question quiz grounded only in the document. " +
      "Mix conceptual and specific questions. After all 5 questions, add an answer key. " +
      "Use markdown.\n\n" +
      `DOCUMENT (${doc.fileName}):\n${doc.content.slice(0, 12000)}`,
  });

  return NextResponse.json({ quiz: text });
}
