import { generateText } from "ai";
import { getModel } from "@/app/lib/llm/provider";
import { INTERVIEW_LEVELS, INTERVIEW_ROLES } from "@/app/lib/interviewRoles";

export interface InterviewSetup {
  role: string;
  difficulty: string;
  jobDescription: string | null;
}

export interface InterviewTurn {
  role: string;
  content: string;
}

export function isInterviewRole(value: unknown): value is string {
  return typeof value === "string" && (INTERVIEW_ROLES as readonly string[]).includes(value);
}

export function isInterviewLevel(value: unknown): value is string {
  return typeof value === "string" && (INTERVIEW_LEVELS as readonly string[]).includes(value);
}

function formatTranscript(turns: InterviewTurn[]) {
  return turns.map((turn) => `${turn.role.toUpperCase()}: ${turn.content}`).join("\n");
}

export async function askQuestion(setup: InterviewSetup, turns: InterviewTurn[]) {
  const transcript = formatTranscript(turns);

  const { text } = await generateText({
    model: getModel(),
    prompt:
      `You are interviewing a candidate for a ${setup.difficulty} ${setup.role} role. ` +
      "Ask exactly one question. No greeting, no numbering, no answer hints. " +
      "Build on their last answer when there is one. Keep it under 60 words.\n\n" +
      (setup.jobDescription ? `JOB DESCRIPTION:\n${setup.jobDescription}\n\n` : "") +
      (transcript ? `TRANSCRIPT SO FAR:\n${transcript}` : "This is the opening question."),
  });

  return text.trim();
}

export async function scoreInterview(setup: InterviewSetup, turns: InterviewTurn[]) {
  const { text } = await generateText({
    model: getModel(),
    prompt:
      "Score this mock interview. First line must be exactly `OVERALL: N` where N is 0-100. " +
      "Then markdown sections: Technical depth, Communication, What to practice. " +
      "Be specific and fair. Do not invent answers they did not give.\n\n" +
      `ROLE: ${setup.difficulty} ${setup.role}\n\n${formatTranscript(turns)}`,
  });

  const match = text.match(/OVERALL:\s*(\d{1,3})/);
  const score = match ? Math.max(0, Math.min(100, Number(match[1]))) : null;
  return { score, feedback: text };
}
