"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import ReactMarkdown from "react-markdown";

import { APIError, deleteSession, getChatHistory, getChatSessions, getDocumentFileUrl, sendChat } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ChatResponse, ChatSession, Citation, TokenSavings } from "@/lib/types";

type Message =
  | { role: "user"; content: string }
  | { role: "ai"; content: ChatResponse };

const MODELS = [
  { label: "Gemini 2.0 Flash", value: "gemini-2.0-flash" },
  { label: "Claude Sonnet 4.6 (gwai)", value: "claude-sonnet-4-6" },
  { label: "Claude Haiku 4.5 (gwai)", value: "claude-haiku-4-5" },
  { label: "GPT-4o Mini", value: "gpt-4o-mini" },
];

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function SavingsBadge({ savings }: { savings: TokenSavings }) {
  if (savings.tokens_saved <= 0) return null;
  return (
    <div className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full w-fit"
      style={{ backgroundColor: "rgba(16,185,129,0.12)", color: "#10b981", border: "1px solid rgba(16,185,129,0.2)" }}
      title={`Used ${fmt(savings.tokens_used)} tokens instead of ${fmt(savings.pdf_tokens_full)}`}
    >
      <svg className="w-3 h-3 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
      <span>Saved <strong>{fmt(savings.tokens_saved)}</strong> tokens ({savings.savings_pct}%)</span>
    </div>
  );
}

function ModelSelect({
  value,
  onChange,
  disabled,
  models,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled: boolean;
  models: { label: string; value: string }[];
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const selected = models.find((m) => m.value === value);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        disabled={disabled}
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg border transition-colors disabled:opacity-40"
        style={{
          backgroundColor: "var(--surface-2)",
          borderColor: open ? "var(--accent)" : "var(--border)",
          color: "var(--text)",
        }}
      >
        <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: "var(--accent)" }} />
        {selected?.label}
        <svg
          className={`w-3 h-3 ml-0.5 transition-transform ${open ? "rotate-180" : ""}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {open && (
        <div
          className="absolute bottom-full mb-1 left-0 z-50 min-w-[160px] rounded-lg border py-1 shadow-xl"
          style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
        >
          {models.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => { onChange(m.value); setOpen(false); }}
              className="w-full flex items-center gap-2 px-3 py-2 text-xs text-left transition-colors"
              style={{
                backgroundColor: m.value === value ? "var(--surface-2)" : "transparent",
                color: m.value === value ? "var(--accent)" : "var(--text)",
              }}
            >
              {m.value === value ? (
                <svg className="w-3 h-3 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                <span className="w-3 flex-shrink-0" />
              )}
              {m.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CitationCard({
  citation,
  onView,
}: {
  citation: Citation;
  onView: (docId: string, filename: string) => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div
      className="rounded-lg border text-xs overflow-hidden"
      style={{ borderColor: "var(--border)", backgroundColor: "var(--surface)" }}
    >
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-3 py-2 text-left gap-2"
        style={{ color: "var(--text-muted)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <svg className="w-3.5 h-3.5 flex-shrink-0" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="truncate font-medium" style={{ color: "var(--text)" }}>{citation.filename}</span>
          {citation.page != null && <span className="flex-shrink-0">p.{citation.page}</span>}
          {citation.score != null && <span className="flex-shrink-0 opacity-60">· {(citation.score * 100).toFixed(0)}%</span>}
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onView(citation.document_id, citation.filename); }}
            className="px-2 py-0.5 rounded text-xs transition-colors"
            style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "var(--accent)" }}
            title="View PDF"
          >
            View
          </button>
          <svg className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && (
        <div className="px-3 pb-3 leading-relaxed" style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border)" }}>
          <p className="pt-2">{citation.snippet}</p>
        </div>
      )}
    </div>
  );
}

export default function ChatPage() {
  const { token, user, logout } = useAuth();
  const [message, setMessage] = useState("");
  const [sessionId, setSessionId] = useState<string | undefined>(undefined);
  const [messages, setMessages] = useState<Message[]>([]);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [selectedModel, setSelectedModel] = useState(MODELS[0].value);
  const [viewingPdf, setViewingPdf] = useState<{ docId: string; filename: string } | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadSessions = useCallback(async () => {
    if (!token) return;
    try {
      const data = await getChatSessions(token);
      setSessions(data);
    } catch { /* silent */ }
  }, [token]);

  useEffect(() => { loadSessions(); }, [loadSessions]);

  async function loadSession(sid: string) {
    if (!token) return;
    try {
      const data = await getChatHistory(token, sid);
      setSessionId(sid);
      setMessages(
        (data.messages ?? []).flatMap<Message>((m) => {
          if (m.role === "user") return [{ role: "user", content: m.content }];
          return [{
            role: "ai",
            content: {
              session_id: sid,
              answer: m.content,
              citations: m.citations ?? [],
            },
          }];
        }),
      );
    } catch { /* silent */ }
  }

  function newSession() {
    setSessionId(undefined);
    setMessages([]);
    setError(null);
  }

  async function onDeleteSession(e: React.MouseEvent, sid: string) {
    e.stopPropagation();
    if (!token) return;
    try {
      await deleteSession(token, sid);
      setSessions((prev) => prev.filter((s) => s.id !== sid));
      if (sessionId === sid) newSession();
    } catch { /* silent */ }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !message.trim()) return;

    const userText = message.trim();
    setError(null);
    setLoading(true);
    setMessage("");
    setMessages((prev) => [...prev, { role: "user", content: userText }]);

    try {
      const response = await sendChat(token, { session_id: sessionId, message: userText, model: selectedModel });
      setSessionId(response.session_id);
      setMessages((prev) => [...prev, { role: "ai", content: response }]);
      loadSessions();
    } catch (err) {
      const msg = err instanceof APIError && err.detail ? err.detail
        : err instanceof Error ? err.message
        : "Chat failed";
      setError(msg);
      setMessages((prev) => prev.slice(0, -1));
    } finally {
      setLoading(false);
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (!loading && message.trim()) e.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className="h-screen flex flex-col" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <header className="border-b flex-shrink-0 z-10" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg btn-ghost"
              title="Toggle sidebar"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <Link href="/" className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
                <span className="text-gray-900 font-bold text-xs">RA</span>
              </div>
              <span className="font-semibold text-sm hidden sm:inline" style={{ color: "var(--text)" }}>Research Assistant</span>
            </Link>
          </div>
          <div className="flex items-center gap-3 text-sm">
            {user && (
              <>
                <Link href="/upload" className="nav-link text-sm hidden sm:inline">My Docs</Link>
                {user.is_admin && (
                  <Link href="/admin" className="nav-link text-sm hidden sm:inline">Admin</Link>
                )}
                <span className="hidden sm:inline text-xs" style={{ color: "var(--text-muted)" }}>{user.email}</span>
                <button onClick={logout} className="nav-link text-sm">Logout</button>
              </>
            )}
          </div>
        </div>
      </header>

      {!user ? (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <h2 className="font-display text-2xl mb-3" style={{ color: "var(--text)" }}>Sign in to start researching</h2>
            <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>Go to sign in →</Link>
          </div>
        </div>
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Sidebar */}
          {sidebarOpen && (
            <aside className="w-60 flex-shrink-0 border-r flex flex-col sidebar-slide" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
              <div className="p-3 border-b" style={{ borderColor: "var(--border)" }}>
                <button
                  onClick={newSession}
                  className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-lg text-sm font-medium transition-colors nav-link-accent"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  New chat
                </button>
              </div>

              <div className="flex-1 overflow-y-auto py-2">
                {sessions.length === 0 ? (
                  <p className="text-xs px-4 py-3" style={{ color: "var(--text-muted)" }}>No previous sessions</p>
                ) : (
                  sessions.map((s) => (
                    <div
                      key={s.id}
                      className="group relative w-full text-left px-4 py-2.5 text-xs cursor-pointer flex items-center gap-2 transition-colors hover:bg-[var(--surface-2)]"
                      style={{
                        backgroundColor: s.id === sessionId ? "rgba(245,158,11,0.08)" : "transparent",
                      }}
                      onClick={() => loadSession(s.id)}
                    >
                      <div className="flex-1 min-w-0">
                        <div className="truncate font-medium" style={{ color: s.id === sessionId ? "var(--accent)" : "var(--text)" }}>
                          {s.title || "Untitled"}
                        </div>
                        <div className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                          {new Date(s.created_at).toLocaleDateString()}
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => onDeleteSession(e, s.id)}
                        className="opacity-0 group-hover:opacity-100 flex-shrink-0 p-0.5 rounded transition-opacity hover:text-red-400"
                        style={{ color: "var(--text-muted)" }}
                        title="Delete session"
                      >
                        <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))
                )}
              </div>

              <div className="p-3 border-t" style={{ borderColor: "var(--border)" }}>
                <Link
                  href="/upload"
                  className="flex items-center gap-2 text-xs py-2 px-3 rounded-lg transition-colors nav-link-accent"
                  style={{ backgroundColor: "var(--surface-2)" }}
                >
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Upload documents
                </Link>
              </div>
            </aside>
          )}

          {/* Main area — PDF viewer + chat */}
          <div className="flex-1 flex overflow-hidden">
            {/* PDF Viewer panel */}
            {viewingPdf && (
              <div className="flex flex-col border-r" style={{ width: "45%", borderColor: "var(--border)", backgroundColor: "var(--surface)" }}>
                <div className="flex items-center justify-between px-4 py-2 border-b flex-shrink-0" style={{ borderColor: "var(--border)" }}>
                  <span className="text-xs truncate font-medium" style={{ color: "var(--text-muted)" }}>{viewingPdf.filename}</span>
                  <button
                    onClick={() => setViewingPdf(null)}
                    className="p-1 rounded flex-shrink-0 btn-ghost"
                    title="Close PDF viewer"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                <iframe
                  src={`${getDocumentFileUrl(viewingPdf.docId)}#toolbar=1`}
                  className="flex-1 w-full"
                  title={viewingPdf.filename}
                />
              </div>
            )}

            {/* Chat panel */}
            <div className="flex flex-col overflow-hidden" style={{ flex: 1 }}>
              <div className="flex-1 overflow-y-auto px-4 py-6 space-y-5">
                {messages.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-center">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: "var(--surface-2)" }}>
                      <svg className="w-7 h-7" style={{ color: "var(--accent)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                    </div>
                    <h3 className="font-display text-xl mb-2" style={{ color: "var(--text)" }}>Ask your documents anything</h3>
                    <p className="text-sm max-w-xs" style={{ color: "var(--text-muted)" }}>
                      Upload PDFs first, then ask questions. Every answer includes source citations.
                    </p>
                    <Link
                      href="/upload"
                      className="mt-6 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--accent-hover)]"
                      style={{ backgroundColor: "var(--accent)", color: "#111827" }}
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                      </svg>
                      Upload your first document
                    </Link>
                  </div>
                ) : (
                  messages.map((msg, i) => (
                    <div key={i}>
                      {msg.role === "user" ? (
                        <div className="flex justify-end">
                          <div
                            className="max-w-xl px-4 py-3 rounded-2xl text-sm"
                            style={{ backgroundColor: "rgba(245,158,11,0.12)", color: "#fde68a" }}
                          >
                            {msg.content}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col gap-3">
                          <div className="flex items-start gap-3">
                            <div className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                              style={{ backgroundColor: "var(--accent)", color: "#111" }}>
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                              </svg>
                            </div>
                            <div
                              className="flex-1 px-4 py-3 rounded-2xl text-sm border-l-2"
                              style={{ backgroundColor: "var(--surface-2)", borderLeftColor: "var(--accent)", color: "var(--text)" }}
                            >
                              <div className="prose prose-invert prose-sm">
                                <ReactMarkdown>{msg.content.answer}</ReactMarkdown>
                              </div>
                            </div>
                          </div>
                          <div className="pl-9">
                          {msg.content.citations.length > 0 && (
                            <div className="max-w-2xl space-y-1.5 pl-3">
                              <p className="text-xs font-medium mb-2" style={{ color: "var(--text-muted)" }}>
                                {msg.content.citations.length} source{msg.content.citations.length !== 1 ? "s" : ""}
                              </p>
                              {msg.content.citations.map((c, ci) => (
                                <CitationCard
                                  key={`${c.document_id}-${ci}`}
                                  citation={c}
                                  onView={(docId, filename) => setViewingPdf({ docId, filename })}
                                />
                              ))}
                            </div>
                          )}
                          {msg.content.savings && (
                            <SavingsBadge savings={msg.content.savings} />
                          )}
                          </div>
                        </div>
                      )}
                    </div>
                  ))
                )}
                {loading && (
                  <div className="flex items-center gap-2 pl-1">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((d) => (
                        <div key={d} className="w-1.5 h-1.5 rounded-full animate-bounce"
                          style={{ backgroundColor: "var(--accent)", animationDelay: `${d * 0.15}s` }} />
                      ))}
                    </div>
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>Researching...</span>
                  </div>
                )}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div className="flex-shrink-0 px-4 pb-4">
                <div className="rounded-xl border" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                  <form onSubmit={onSubmit}>
                    <textarea
                      rows={2}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask a question about your documents... (Enter to send)"
                      className="w-full px-4 pt-3 pb-1 bg-transparent text-sm resize-none focus:outline-none"
                      style={{ color: "var(--text)" }}
                      disabled={loading}
                    />
                    <div className="flex items-center justify-between px-4 pb-3 pt-1 gap-3">
                      <div className="flex items-center gap-2 flex-1 min-w-0">
                        {/* Model selector */}
                        <ModelSelect
                          value={selectedModel}
                          onChange={setSelectedModel}
                          disabled={loading}
                          models={MODELS}
                        />

                        {error ? (
                          <p className="text-xs flex items-center gap-1 truncate" style={{ color: "var(--error)" }}>
                            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                            </svg>
                            {error}
                          </p>
                        ) : (
                          <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                            {sessionId ? "Continuing session" : "New session"}
                          </span>
                        )}
                      </div>

                      <button
                        type="submit"
                        disabled={loading || !message.trim()}
                        className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed flex-shrink-0 hover:bg-[var(--accent-hover)]"
                        style={{ backgroundColor: "var(--accent)", color: "#111827" }}
                      >
                        Send
                        <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                        </svg>
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
