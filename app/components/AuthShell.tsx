import Link from "next/link";

export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
  footer: React.ReactNode;
}) {
  return (
    <main className="grid h-screen place-items-center overflow-y-auto bg-[var(--canvas)] px-6 text-[var(--cream)]">
      <div className="w-full max-w-[420px]">
        <Link href="/" className="font-display text-2xl italic tracking-tight">
          pptChat
        </Link>
        <h1 className="font-display mt-10 text-5xl italic leading-none tracking-tight">
          {title}
        </h1>
        <p className="mt-4 text-sm leading-relaxed text-[var(--mute)]">{subtitle}</p>
        <div className="mt-8">{children}</div>
        <p className="mt-6 text-sm text-[var(--mute)]">{footer}</p>
      </div>
    </main>
  );
}
