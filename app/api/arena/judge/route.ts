import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";
import { getModel } from "@/app/lib/llm/provider";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;

  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic.slice(0, 240) : "";
  const pro = typeof body.pro === "string" ? body.pro.slice(0, 4000) : "";
  const con = typeof body.con === "string" ? body.con.slice(0, 4000) : "";
  if (!topic || !pro || !con) {
    return NextResponse.json({ message: "topic, pro, and con are required" }, { status: 400 });
  }

  const { text } = await generateText({
    model: getModel(),
    prompt:
      "You are a debate judge. Pick a winner and explain why in under 120 words. " +
      "Start with exactly `WINNER: PRO` or `WINNER: CON`.\n\n" +
      `TOPIC: ${topic}\n\nPRO:\n${pro}\n\nCON:\n${con}`,
  });

  return NextResponse.json({ verdict: text });
}
