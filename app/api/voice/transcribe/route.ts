import { auth } from "@clerk/nextjs/server";
import { groq } from "@ai-sdk/groq";
import { experimental_transcribe as transcribe } from "ai";
import { clientKey, rateLimit, tooManyRequests } from "@/app/api/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 10 * 1024 * 1024;

/**
 * Speech-to-text fallback for browsers without the Web Speech API.
 * Signed-in users are unlimited; the public interview demo is rate-limited per IP.
 */
export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    const limit = rateLimit(clientKey(request, "transcribe"), 20, 10 * 60 * 1000);
    if (!limit.ok) return tooManyRequests(limit.retryAfter);
  }

  if (!process.env.GROQ_API_KEY) {
    return Response.json(
      { message: "Voice transcription needs GROQ_API_KEY on the server." },
      { status: 503 },
    );
  }

  const form = await request.formData().catch(() => null);
  const audio = form?.get("audio");
  if (!(audio instanceof File) || audio.size === 0) {
    return Response.json({ message: "audio is required" }, { status: 400 });
  }
  if (audio.size > MAX_BYTES) {
    return Response.json({ message: "Recording must be under 10 MB" }, { status: 400 });
  }

  try {
    const result = await transcribe({
      model: groq.transcription(process.env.GROQ_TRANSCRIBE_MODEL || "whisper-large-v3-turbo"),
      audio: new Uint8Array(await audio.arrayBuffer()),
    });
    return Response.json({ text: result.text.trim() });
  } catch (error) {
    console.error("[voice] transcription failed", error);
    return Response.json({ message: "Could not transcribe that recording" }, { status: 502 });
  }
}
