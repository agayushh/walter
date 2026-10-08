import { generateText } from "ai";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import { memoriesTable } from "@/db/schema/schema";
import { getModel } from "@/app/lib/llm/provider";

export async function recallMemories(userId: string) {
  await ensureExtras();
  const rows = await db
    .select()
    .from(memoriesTable)
    .where(eq(memoriesTable.userId, userId))
    .orderBy(desc(memoriesTable.createdAt))
    .limit(16);
  return rows.map((row) => row.content);
}

export async function extractMemories(
  userId: string,
  userText: string,
  assistantText: string,
) {
  if (userText.trim().length < 12) return;
  await ensureExtras();

  const { text } = await generateText({
    model: getModel(),
    temperature: 0,
    prompt:
      "From this exchange, list up to 3 stable facts about the USER only " +
      "(preferences, background, goals, constraints). " +
      "Never store passwords, API keys, or secrets. " +
      "One fact per line. No bullets or numbering. " +
      "If nothing is worth remembering, reply with exactly NONE.\n\n" +
      `USER:\n${userText.slice(0, 2000)}\n\nASSISTANT:\n${assistantText.slice(0, 2000)}`,
  });

  if (text.trim().toUpperCase() === "NONE") return;

  const facts = [
    ...new Set(
      text
        .split("\n")
        .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
        .filter((line) => line && line.toUpperCase() !== "NONE" && line.length < 280),
    ),
  ].slice(0, 3);

  if (!facts.length) return;

  await db.insert(memoriesTable).values(
    facts.map((content) => ({
      userId,
      content,
    })),
  );
}
