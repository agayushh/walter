"use client";

import { useCallback, useEffect, useState } from "react";
import ReactMarkdown from "react-markdown";
import AppShell from "@/app/components/AppShell";
import TopBar from "@/app/components/TopBar";

interface Memory {
  id: string;
  content: string;
}

interface DocumentRow {
  id: string;
  fileName: string;
  pinned: boolean;
  excerpt: string;
}

export default function LibraryPage() {
  const [memories, setMemories] = useState<Memory[]>([]);
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [draft, setDraft] = useState("");
  const [quiz, setQuiz] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    const [memoryRes, docRes] = await Promise.all([
      fetch("/api/memory"),
      fetch("/api/documents"),
    ]);
    if (memoryRes.ok) {
      const data = await memoryRes.json();
      setMemories(data.memories ?? []);
    }
    if (docRes.ok) {
      const data = await docRes.json();
      setDocuments(data.documents ?? []);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const addMemory = async () => {
    setError("");
    const response = await fetch("/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ content: draft }),
    });
    const data = await response.json();
    if (!response.ok) {
      setError(data.message || "Could not save that memory");
      return;
    }
    setDraft("");
    setMemories((prev) => [data.memory, ...prev]);
  };

  const removeMemory = async (id: string) => {
    await fetch(`/api/memory?id=${id}`, { method: "DELETE" });
    setMemories((prev) => prev.filter((memory) => memory.id !== id));
  };

  const togglePin = async (doc: DocumentRow) => {
    await fetch("/api/documents", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: doc.id, pinned: !doc.pinned }),
    });
    window.dispatchEvent(new Event("pptchat:docs-changed"));
    setDocuments((prev) =>
      prev.map((item) => (item.id === doc.id ? { ...item, pinned: !item.pinned } : item)),
    );
  };

  const removeDoc = async (id: string) => {
    await fetch(`/api/documents?id=${id}`, { method: "DELETE" });
    window.dispatchEvent(new Event("pptchat:docs-changed"));
    setDocuments((prev) => prev.filter((doc) => doc.id !== id));
  };

  const makeQuiz = async (id: string) => {
    setQuiz("Writing a quiz from this document…");
    const response = await fetch("/api/documents/quiz", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    const data = await response.json();
    setQuiz(response.ok ? data.quiz : data.message || "Quiz failed");
  };

  return (
    <AppShell>
      <TopBar title={<span className="font-medium">Library</span>} />
      <div className="flex-1 overflow-y-auto px-6 py-6">
        <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-2">
          <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <h2 className="font-display text-3xl italic">Memory</h2>
            <p className="mt-1 text-sm text-white/45">
              Facts pptChat keeps and injects into later chats.
            </p>
            <div className="mt-4 flex gap-2">
              <input
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                placeholder="Remember that I prefer TypeScript"
                className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm outline-none"
              />
              <button
                type="button"
                onClick={() => void addMemory()}
                className="rounded-xl bg-[var(--lime)] px-3 text-sm font-medium text-[var(--lime-ink)]"
              >
                Add
              </button>
            </div>
            {error && <p className="mt-2 text-xs text-red-300">{error}</p>}
            <ul className="mt-4 space-y-2">
              {memories.map((memory) => (
                <li
                  key={memory.id}
                  className="flex items-start justify-between gap-3 rounded-xl bg-white/[0.03] px-3 py-2 text-sm"
                >
                  <span>{memory.content}</span>
                  <button
                    type="button"
                    onClick={() => void removeMemory(memory.id)}
                    className="text-xs text-white/40 hover:text-red-300"
                  >
                    Delete
                  </button>
                </li>
              ))}
              {memories.length === 0 && (
                <li className="text-sm text-white/35">No memories yet. Chat, and some will appear.</li>
              )}
            </ul>
          </section>

          <section className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
            <h2 className="font-display text-3xl italic">Documents</h2>
            <p className="mt-1 text-sm text-white/45">
              Pinned files are included in chat. Generate a quiz from any of them.
            </p>
            <ul className="mt-4 space-y-3">
              {documents.map((doc) => (
                <li key={doc.id} className="rounded-xl bg-white/[0.03] p-3">
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{doc.fileName}</p>
                    <span className="text-[11px] text-white/40">
                      {doc.pinned ? "Pinned" : "Unpinned"}
                    </span>
                  </div>
                  <p className="mt-1 line-clamp-2 text-xs text-white/45">{doc.excerpt}</p>
                  <div className="mt-2 flex gap-3 text-xs">
                    <button type="button" onClick={() => void togglePin(doc)} className="text-[var(--lime)]">
                      {doc.pinned ? "Unpin" : "Pin"}
                    </button>
                    <button type="button" onClick={() => void makeQuiz(doc.id)} className="text-[var(--cream)] underline underline-offset-4">
                      Quiz me
                    </button>
                    <button type="button" onClick={() => void removeDoc(doc.id)} className="text-white/40">
                      Delete
                    </button>
                  </div>
                </li>
              ))}
              {documents.length === 0 && (
                <li className="text-sm text-white/35">
                  Attach a file from the chat composer to see it here.
                </li>
              )}
            </ul>
          </section>
        </div>

        {quiz && (
          <article className="mx-auto mt-6 max-w-5xl rounded-2xl border border-white/10 p-5 text-sm [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5">
            <ReactMarkdown>{quiz}</ReactMarkdown>
          </article>
        )}
      </div>
    </AppShell>
  );
}
