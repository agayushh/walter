import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import { documentsTable } from "@/db/schema/schema";
import { extractFileText } from "@/app/lib/documents/extract";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 8 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ message: "file is required" }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ message: "File must be under 8 MB" }, { status: 400 });
  }

  try {
    const extracted = await extractFileText(file);
    const [document] = await db
      .insert(documentsTable)
      .values({
        userId: authResult.dbUser.id,
        fileName: extracted.fileName,
        content: extracted.content,
        pinned: true,
      })
      .returning({
        id: documentsTable.id,
        fileName: documentsTable.fileName,
        pinned: documentsTable.pinned,
      });

    return NextResponse.json({ document }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not read that file";
    return NextResponse.json({ message }, { status: 400 });
  }
}
