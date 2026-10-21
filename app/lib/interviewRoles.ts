export const INTERVIEW_ROLES = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Data / ML",
  "System design",
  "Product",
] as const;

export const INTERVIEW_LEVELS = ["Intern", "Mid-level", "Senior"] as const;

/** Questions in the public no-account demo; signed-in rounds ask five. */
export const DEMO_QUESTION_LIMIT = 3;

export type InterviewRole = (typeof INTERVIEW_ROLES)[number];
export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];
