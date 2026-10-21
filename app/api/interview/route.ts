import { and, asc, desc, eq } from "drizzle-orm";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { ensureExtras } from "@/db/ensure";
import {
  interviewSessionsTable,
  interviewTurnsTable,
} from "@/db/schema/schema";
import {
  askQuestion,
  isInterviewLevel,
  isInterviewRole,
  scoreInterview,
} from "@/app/lib/interview";
import { requireDbUser } from "@/app/api/lib/requireUser";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const QUESTION_LIMIT = 5;

export async function GET(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const id = request.nextUrl.searchParams.get("id");
  if (!id) {
    const sessions = await db
      .select({
        id: interviewSessionsTable.id,
        role: interviewSessionsTable.role,
        difficulty: interviewSessionsTable.difficulty,
        status: interviewSessionsTable.status,
        score: interviewSessionsTable.score,
        createdAt: interviewSessionsTable.createdAt,
      })
      .from(interviewSessionsTable)
      .where(eq(interviewSessionsTable.userId, authResult.dbUser.id))
      .orderBy(desc(interviewSessionsTable.createdAt))
      .limit(20);
    return NextResponse.json({ sessions });
  }

  const [session] = await db
    .select()
    .from(interviewSessionsTable)
    .where(
      and(
        eq(interviewSessionsTable.id, id),
        eq(interviewSessionsTable.userId, authResult.dbUser.id),
      ),
    )
    .limit(1);

  if (!session) {
    return NextResponse.json({ message: "Interview not found" }, { status: 404 });
  }

  const turns = await db
    .select()
    .from(interviewTurnsTable)
    .where(eq(interviewTurnsTable.sessionId, session.id))
    .orderBy(asc(interviewTurnsTable.createdAt));

  return NextResponse.json({ session, turns });
}

export async function POST(request: NextRequest) {
  const authResult = await requireDbUser();
  if ("error" in authResult) return authResult.error;
  await ensureExtras();

  const body = await request.json().catch(() => ({}));
  const action = body.action;

  if (action === "start") {
    return startInterview(authResult.dbUser.id, body);
  }
  if (action === "answer") {
    return answerInterview(authResult.dbUser.id, body);
  }
  if (action === "finish") {
    return finishInterview(authResult.dbUser.id, body.sessionId);
  }

  return NextResponse.json({ message: "Unknown action" }, { status: 400 });
}

async function startInterview(
  userId: string,
  body: { role?: string; difficulty?: string; jobDescription?: string },
) {
  if (!isInterviewRole(body.role)) {
    return NextResponse.json({ message: "Pick a role" }, { status: 400 });
  }
  if (!isInterviewLevel(body.difficulty)) {
    return NextResponse.json({ message: "Pick a difficulty" }, { status: 400 });
  }

  const jobDescription =
    typeof body.jobDescription === "string"
      ? body.jobDescription.trim().slice(0, 4000)
      : "";

  const [session] = await db
    .insert(interviewSessionsTable)
    .values({
      userId,
      role: body.role,
      difficulty: body.difficulty,
      jobDescription: jobDescription || null,
      status: "active",
    })
    .returning();

  const question = await askQuestion(session, []);
  await db.insert(interviewTurnsTable).values({
    sessionId: session.id,
    role: "interviewer",
    content: question,
  });

  return NextResponse.json({ sessionId: session.id, question });
}

async function answerInterview(
  userId: string,
  body: { sessionId?: string; content?: string },
) {
  const content = typeof body.content === "string" ? body.content.trim() : "";
  if (!body.sessionId || !content) {
    return NextResponse.json(
      { message: "sessionId and content are required" },
      { status: 400 },
    );
  }

  const session = await loadOwnedSession(userId, body.sessionId);
  if (!session) {
    return NextResponse.json({ message: "Interview not found" }, { status: 404 });
  }
  if (session.status !== "active") {
    return NextResponse.json({ message: "This interview is already scored" }, { status: 400 });
  }

  await db.insert(interviewTurnsTable).values({
    sessionId: session.id,
    role: "candidate",
    content: content.slice(0, 4000),
  });

  const turns = await loadTurns(session.id);
  const answers = turns.filter((turn) => turn.role === "candidate").length;
  if (answers >= QUESTION_LIMIT) {
    const scored = await scoreSession(session.id);
    return NextResponse.json({ done: true, ...scored });
  }

  const question = await askQuestion(session, turns);
  await db.insert(interviewTurnsTable).values({
    sessionId: session.id,
    role: "interviewer",
    content: question,
  });

  return NextResponse.json({
    done: false,
    question,
    remaining: QUESTION_LIMIT - answers,
  });
}

async function finishInterview(userId: string, sessionId?: string) {
  if (!sessionId) {
    return NextResponse.json({ message: "sessionId is required" }, { status: 400 });
  }
  const session = await loadOwnedSession(userId, sessionId);
  if (!session) {
    return NextResponse.json({ message: "Interview not found" }, { status: 404 });
  }
  if (session.status === "done" && session.feedback) {
    return NextResponse.json({
      done: true,
      score: session.score,
      feedback: session.feedback,
    });
  }
  const turns = await loadTurns(session.id);
  if (!turns.some((turn) => turn.role === "candidate")) {
    return NextResponse.json(
      { message: "Answer at least one question before scoring" },
      { status: 400 },
    );
  }
  const scored = await scoreSession(session.id);
  return NextResponse.json({ done: true, ...scored });
}

async function loadOwnedSession(userId: string, sessionId: string) {
  const [session] = await db
    .select()
    .from(interviewSessionsTable)
    .where(
      and(
        eq(interviewSessionsTable.id, sessionId),
        eq(interviewSessionsTable.userId, userId),
      ),
    )
    .limit(1);
  return session;
}

async function loadTurns(sessionId: string) {
  return db
    .select()
    .from(interviewTurnsTable)
    .where(eq(interviewTurnsTable.sessionId, sessionId))
    .orderBy(asc(interviewTurnsTable.createdAt));
}

async function scoreSession(sessionId: string) {
  const [session] = await db
    .select()
    .from(interviewSessionsTable)
    .where(eq(interviewSessionsTable.id, sessionId))
    .limit(1);
  const turns = await loadTurns(sessionId);
  const { score, feedback } = await scoreInterview(session, turns);

  await db
    .update(interviewSessionsTable)
    .set({ status: "done", score, feedback })
    .where(eq(interviewSessionsTable.id, sessionId));

  return { score, feedback };
}
