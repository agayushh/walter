import { streamText } from "ai";
import { getModel } from "@/app/lib/llm/provider";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;

  const body = await request.json().catch(() => ({}));
  const topic = typeof body.topic === "string" ? body.topic.trim() : "";
  if (!topic || topic.length > 240) {
    return Response.json(
      { message: "Give the arena a topic under 240 characters" },
      { status: 400 },
    );
  }

  const result = streamText({
    model: getModel(typeof body.provider === "string" ? body.provider : undefined),
    prompt:
      "You are staging a live debate between two sharp opponents. " +
      "Write the affirmative case first, then the negative case. " +
      "Use exactly these markers on their own lines and nowhere else:\n" +
      "<<<PRO>>>\n" +
      "<<<CON>>>\n" +
      "Each side gets two short paragraphs. Be specific, disagree hard, and do not add a winner.\n\n" +
      `TOPIC: ${topic}`,
  });

  return result.toTextStreamResponse();
}
