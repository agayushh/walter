export const INTERVIEW_ROLES = [
  "Frontend",
  "Backend",
  "Full-stack",
  "Data / ML",
  "System design",
  "Product",
] as const;

export const INTERVIEW_LEVELS = ["Intern", "Mid-level", "Senior"] as const;

export type InterviewRole = (typeof INTERVIEW_ROLES)[number];
export type InterviewLevel = (typeof INTERVIEW_LEVELS)[number];
