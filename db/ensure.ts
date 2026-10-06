import { sql } from "drizzle-orm";
import { db } from "@/db";

let ready: Promise<void> | null = null;

/**
 * Creates the feature tables on first use so chat, memory, documents,
 * and interviews work without a separate migration step.
 */
export function ensureExtras() {
  if (!ready) {
    ready = createTables().catch((error) => {
      ready = null;
      throw error;
    });
  }
  return ready;
}

async function createTables() {
  const statements = [
    sql`CREATE TABLE IF NOT EXISTS memories (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      content text NOT NULL,
      created_at timestamptz DEFAULT now()
    )`,
    sql`CREATE INDEX IF NOT EXISTS memories_to_user ON memories (user_id)`,
    sql`CREATE TABLE IF NOT EXISTS documents (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      file_name varchar NOT NULL,
      content text NOT NULL,
      pinned boolean NOT NULL DEFAULT true,
      created_at timestamptz DEFAULT now()
    )`,
    sql`CREATE INDEX IF NOT EXISTS documents_to_user ON documents (user_id)`,
    sql`CREATE TABLE IF NOT EXISTS interview_sessions (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      role varchar NOT NULL,
      difficulty varchar NOT NULL,
      job_description text,
      status varchar NOT NULL DEFAULT 'active',
      score integer,
      feedback text,
      created_at timestamptz DEFAULT now()
    )`,
    sql`CREATE INDEX IF NOT EXISTS interviews_to_user ON interview_sessions (user_id)`,
    sql`CREATE TABLE IF NOT EXISTS interview_turns (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      session_id uuid NOT NULL REFERENCES interview_sessions(id) ON DELETE CASCADE,
      role varchar NOT NULL,
      content text NOT NULL,
      created_at timestamptz DEFAULT now()
    )`,
    sql`CREATE INDEX IF NOT EXISTS interview_turns_to_session ON interview_turns (session_id)`,
  ];

  for (const statement of statements) {
    await db.execute(statement);
  }
}
