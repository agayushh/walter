import {
  askQuestion,
  isInterviewLevel,
  isInterviewRole,
  scoreInterview,
  type InterviewTurn,
} from "@/app/lib/interview";
import { DEMO_QUESTION_LIMIT } from "@/app/lib/interviewRoles";
import { clientKey, rateLimit, tooManyRequests } from "@/app/api/lib/rateLimit";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_TURN_CHARS = 1500;

/**
 * Public, no-account interview. Nothing is stored: the browser sends the
 * transcript each time, and the server caps its size so it cannot be used
 * as a free general-purpose LLM.
 */
export async function POST(request: Request) {
  const limit = rateLimit(clientKey(request, "interview-demo"), 30, 60 * 60 * 1000);
  if (!limit.ok) return tooManyRequests(limit.retryAfter);

  const body = await request.json().catch(() => ({}));
  if (!isInterviewRole(body.role)) {
    return Response.json({ message: "Pick a role" }, { status: 400 });
  }
  if (!isInterviewLevel(body.difficulty)) {
    return Response.json({ message: "Pick a difficulty" }, { status: 400 });
  }

  const turns = parseTurns(body.turns);
  if (!turns) {
    return Response.json({ message: "Invalid transcript" }, { status: 400 });
  }

  const setup = { role: body.role, difficulty: body.difficulty, jobDescription: null };
  const answers = turns.filter((turn) => turn.role === "candidate").length;

  try {
    if (body.action === "finish" || answers >= DEMO_QUESTION_LIMIT) {
      if (!answers) {
        return Response.json(
          { message: "Answer at least one question before scoring" },
          { status: 400 },
        );
      }
      const scored = await scoreInterview(setup, turns);
      return Response.json({ done: true, ...scored });
    }

    const question = await askQuestion(setup, turns);
    return Response.json({
      done: false,
      question,
      remaining: DEMO_QUESTION_LIMIT - answers,
    });
  } catch (error) {
    console.error("[interview-demo] model call failed", error);
    return Response.json({ message: "The interviewer is unavailable right now" }, { status: 502 });
  }
}

function parseTurns(raw: unknown): InterviewTurn[] | null {
  if (raw === undefined) return [];
  if (!Array.isArray(raw) || raw.length > DEMO_QUESTION_LIMIT * 2) return null;

  const turns: InterviewTurn[] = [];
  for (const item of raw) {
    const role = item?.role;
    const content = typeof item?.content === "string" ? item.content.trim() : "";
    if ((role !== "interviewer" && role !== "candidate") || !content) return null;
    turns.push({ role, content: content.slice(0, MAX_TURN_CHARS) });
  }
  return turns;
}
