"use client";

import { UserButton } from "@clerk/nextjs";

export default function TopBar({
  title,
  children,
}: {
  title?: React.ReactNode;
  children?: React.ReactNode;
}) {
  return (
    <header className="flex h-14 shrink-0 items-center justify-between px-4 sm:px-5">
      <div className="min-w-0 text-sm text-[var(--cream)]">{title}</div>
      <div className="flex items-center gap-2">
        {children}
        <UserButton
          appearance={{
            elements: {
              userButtonAvatarBox: "h-8 w-8",
            },
          }}
        />
      </div>
    </header>
  );
}
