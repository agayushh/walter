import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import Link from "next/link";

const features = [
  {
    index: "01",
    title: "Memory you can edit",
    copy: "Facts from your chats show up in a library. Keep them, add your own, or delete the ones that are wrong.",
  },
  {
    index: "02",
    title: "Files in the prompt",
    copy: "Pin a PDF or notes. Later questions pull the relevant passages instead of guessing.",
  },
  {
    index: "03",
    title: "Interview booth",
    copy: "Five questions for a role and level, by voice or text, then a score and what to practice.",
  },
  {
    index: "04",
    title: "Debate arena",
    copy: "Two sides argue a topic in real time. A judge picks a winner when they are done.",
  },
];

export default async function Page() {
  const { userId } = await auth();
  if (userId) redirect("/chat");

  return (
    <main className="h-screen overflow-y-auto bg-[var(--canvas)] text-[var(--cream)]">
      <div className="mx-auto max-w-6xl px-6 py-6">
        <header className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--lime)] text-xs font-semibold text-[var(--lime-ink)]">
              p
            </span>
            <span className="text-sm font-medium">pptChat</span>
          </Link>
          <div className="flex items-center gap-2 text-sm">
            <Link href="/sign-in" className="rounded-full px-3 py-2 text-[var(--mute)] hover:text-[var(--cream)]">
              Sign in
            </Link>
            <Link
              href="/sign-up"
              className="rounded-full bg-[var(--cream)] px-4 py-2 font-medium text-black"
            >
              Get started
            </Link>
          </div>
        </header>

        <section className="grid items-end gap-12 pb-16 pt-20 lg:grid-cols-[1.15fr_0.85fr]">
          <div>
            <p className="text-[11px] uppercase tracking-[0.22em] text-[var(--lime)]">
              Chat, memory, interviews
            </p>
            <h1 className="font-display mt-4 max-w-xl text-6xl italic leading-[0.95] tracking-tight sm:text-7xl">
              An assistant that keeps the thread.
            </h1>
            <p className="mt-6 max-w-md text-base leading-relaxed text-[var(--mute)]">
              pptChat streams answers, remembers what you tell it, reads the files you pin,
              and can interview you or stage a debate.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link
                href="/sign-up"
                className="rounded-full bg-[var(--lime)] px-5 py-3 text-sm font-medium text-[var(--lime-ink)]"
              >
                Start chatting
              </Link>
              <Link
                href="/sign-in"
                className="rounded-full border border-white/12 px-5 py-3 text-sm text-[var(--cream)]"
              >
                I have an account
              </Link>
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-[var(--panel)] p-5 shadow-[0_30px_80px_rgba(0,0,0,0.35)]">
            <div className="mb-5 flex items-center justify-between text-xs text-[var(--mute)]">
              <span>New chat</span>
              <span className="rounded-full bg-white/6 px-2 py-1">Groq</span>
            </div>
            <div className="space-y-4">
              <div className="ml-auto max-w-[80%] rounded-[20px] rounded-br-md bg-[#2a2a2e] px-4 py-2.5 text-sm">
                I am interviewing for a mid-level frontend role next week.
              </div>
              <div className="text-sm leading-7 text-[var(--cream)]">
                Noted. I will keep that in mind. Want a five-question mock interview,
                or should we review a job description first?
              </div>
            </div>
            <div className="mt-6 rounded-full border border-white/10 bg-black/30 px-4 py-3 text-sm text-white/30">
              Ask anything
            </div>
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-[28px] border border-white/8 bg-white/8 sm:grid-cols-2">
          {features.map((feature) => (
            <article key={feature.index} className="bg-[var(--canvas)] p-6 sm:p-8">
              <p className="font-display text-2xl italic text-[var(--lime)]">{feature.index}</p>
              <h2 className="mt-3 text-lg font-medium">{feature.title}</h2>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-[var(--mute)]">{feature.copy}</p>
            </article>
          ))}
        </section>
        <p className="py-8 text-center text-xs text-white/30">Sign in with Google to open the workspace.</p>
      </div>
    </main>
  );
}
