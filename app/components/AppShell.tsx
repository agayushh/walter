"use client";

import Sidebar from "@/app/components/Sidebar";

export default function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-screen w-screen gap-2 overflow-hidden bg-[var(--canvas)] p-2 text-[var(--cream)]">
      <Sidebar />
      <div className="relative flex min-w-0 flex-1 flex-col overflow-hidden rounded-[22px] border border-white/8 bg-[var(--stage)]">
        {children}
      </div>
    </div>
  );
}
