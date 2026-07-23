"use client";
import React, { useEffect, useState } from "react";
import { getAllTheChats } from "../utils/useChat";
import { ChevronsRightLeft, SquarePen, Images, MessageSquare } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";

const sideBarMenuOptions = [
  {
    name: "New Chat",
    icon: <SquarePen className="h-4 w-4" />,
    redirect: "/chat",
  },
  {
    name: "Images",
    icon: <Images className="h-4 w-4" />,
    redirect: "/images",
  },
];

const Sidebar = () => {
  const [allChats, setAllChats] = useState<any[]>([]);
  const [sideBarOpen, setSideBarOpen] = useState<boolean>(true);
  const params = useParams();
  const currentChatId = params?.chatId;

  useEffect(() => {
    const fetchChats = async () => {
      const res = await getAllTheChats();
      setAllChats(res?.chats || []);
    };
    fetchChats();
  }, []);

  return (
    <div className="flex justify-start w-fit">
      <div
        className={`${
          sideBarOpen ? "w-72" : "w-16"
        } transition-all duration-300 ease-in-out border-r h-screen border-white/10 bg-zinc-950 flex flex-col justify-between text-white`}
      >
        <div className="flex flex-col flex-1 overflow-hidden">
          {/* logo and toggle button */}
          <div className="flex items-center justify-between p-4 min-h-[60px]">
            {sideBarOpen && (
              <span className="font-semibold text-lg bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">
                pptChat
              </span>
            )}
            <button
              onClick={() => setSideBarOpen(!sideBarOpen)}
              className="p-1.5 hover:bg-white/10 rounded-lg transition-colors ml-auto"
            >
              <ChevronsRightLeft className={`h-5 w-5 transition-transform duration-300 ${!sideBarOpen ? "rotate-180" : ""}`} />
            </button>
          </div>

          {/* Navigation Menu */}
          <div className="px-2 space-y-1">
            {sideBarMenuOptions.map((menu, id) => {
              return (
                <Link
                  key={id}
                  href={menu.redirect}
                  className="flex items-center gap-3 px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-white/5 transition-all text-sm font-medium"
                >
                  <span className="shrink-0">{menu.icon}</span>
                  {sideBarOpen && <span>{menu.name}</span>}
                </Link>
              );
            })}
          </div>

          {/* Chat History Section */}
          <div className="flex-1 flex flex-col min-h-0 mt-6">
            {sideBarOpen && (
              <div className="px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Recent Chats
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-2 space-y-1 scrollbar-thin">
              {allChats.map((chat) => {
                const isActive = chat.id === currentChatId;
                return (
                  <Link
                    key={chat.id}
                    href={`/chat/${chat.id}`}
                    className={`flex items-center gap-3 px-3 py-2 rounded-xl text-sm transition-all duration-200 ${
                      isActive
                        ? "bg-white/10 text-white font-medium"
                        : "text-slate-400 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <MessageSquare className="h-4 w-4 shrink-0" />
                    {sideBarOpen && (
                      <span className="truncate flex-1">{chat.title}</span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
