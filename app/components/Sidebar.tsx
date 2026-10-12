"use client";

import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, usePathname, useRouter } from "next/navigation";
import {
  Library,
  Mic,
  PanelLeft,
  Search,
  SquarePen,
  Swords,
  Trash2,
} from "lucide-react";
import { deleteChat, getAllTheChats } from "../utils/useChat";

const menu = [
  { name: "New chat", icon: SquarePen, href: "/chat", exact: true },
  { name: "Interview", icon: Mic, href: "/interview", exact: false },
  { name: "Arena", icon: Swords, href: "/arena", exact: false },
  { name: "Library", icon: Library, href: "/library", exact: false },
];

const Sidebar = () => {
  const [allChats, setAllChats] = useState<{ id: string; title: string }[]>([]);
  const [sideBarOpen, setSideBarOpen] = useState(true);
  const [query, setQuery] = useState("");
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentChatId = params?.chatId;

  const load = async () => {
    const res = await getAllTheChats();
    setAllChats(res?.chats || []);
  };

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener("pptchat:chats-changed", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("pptchat:chats-changed", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        router.push("/chat");
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [router]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return allChats;
    return allChats.filter((chat) => chat.title.toLowerCase().includes(needle));
  }, [allChats, query]);

  const remove = async (chatId: string) => {
    await deleteChat(chatId);
    setAllChats((prev) => prev.filter((chat) => chat.id !== chatId));
    if (currentChatId === chatId) router.push("/chat");
  };

  return (
    <aside
      className={`${
        sideBarOpen ? "w-[268px]" : "w-[68px]"
      } flex h-full shrink-0 flex-col rounded-[22px] border border-white/8 bg-[var(--panel)] text-[var(--cream)] transition-[width] duration-200`}
    >
      <div className="flex items-center gap-2 px-3 pt-3">
        {sideBarOpen && (
          <Link href="/chat" className="flex min-w-0 flex-1 items-center gap-2 px-1">
            <span className="grid h-7 w-7 place-items-center rounded-lg bg-[var(--lime)] text-xs font-semibold text-[var(--lime-ink)]">
              p
            </span>
            <span className="truncate text-[15px] font-medium tracking-tight">pptChat</span>
          </Link>
        )}
        <button
          type="button"
          onClick={() => setSideBarOpen((open) => !open)}
          className="grid h-8 w-8 shrink-0 place-items-center rounded-lg text-[var(--mute)] hover:bg-white/6 hover:text-[var(--cream)]"
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </button>
      </div>

      <nav className="mt-3 space-y-0.5 px-2">
        {menu.map((item) => {
          const active = item.exact ? pathname === item.href : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              title={item.name}
              className={`flex items-center gap-2.5 rounded-xl px-2.5 py-2 text-sm transition-colors ${
                active
                  ? "bg-white/8 text-[var(--cream)]"
                  : "text-[var(--mute)] hover:bg-white/5 hover:text-[var(--cream)]"
              } ${sideBarOpen ? "" : "justify-center"}`}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {sideBarOpen && <span>{item.name}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="mt-5 flex min-h-0 flex-1 flex-col">
        {sideBarOpen && (
          <div className="px-3">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--mute)]" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search"
                className="w-full rounded-xl border border-white/8 bg-black/20 py-2 pl-8 pr-3 text-xs outline-none placeholder:text-white/30 focus:border-white/20"
              />
            </label>
            <p className="mb-1 mt-4 px-1 text-[11px] font-medium uppercase tracking-[0.14em] text-white/35">
              Recents
            </p>
          </div>
        )}
        <div className="mt-1 flex-1 space-y-0.5 overflow-y-auto px-2 pb-3">
          {visible.map((chat) => {
            const isActive = chat.id === currentChatId;
            return (
              <div
                key={chat.id}
                className={`group flex items-center rounded-xl text-sm ${
                  isActive
                    ? "bg-white/8 text-[var(--cream)]"
                    : "text-[var(--mute)] hover:bg-white/5 hover:text-[var(--cream)]"
                }`}
              >
                <Link
                  href={`/chat/${chat.id}`}
                  title={chat.title}
                  className={`min-w-0 flex-1 truncate px-2.5 py-2 ${sideBarOpen ? "" : "text-center"}`}
                >
                  {sideBarOpen ? chat.title : chat.title.slice(0, 1)}
                </Link>
                {sideBarOpen && (
                  <button
                    type="button"
                    aria-label="Delete chat"
                    onClick={() => void remove(chat.id)}
                    className="mr-1 grid h-7 w-7 place-items-center rounded-lg text-white/0 hover:text-red-300 group-hover:text-white/40"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                )}
              </div>
            );
          })}
          {sideBarOpen && visible.length === 0 && (
            <p className="px-2.5 py-2 text-xs text-white/30">No chats yet</p>
          )}
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
