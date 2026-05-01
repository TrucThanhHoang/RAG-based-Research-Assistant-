"use client";

import Link from "next/link";
import { useAuth } from "@/lib/auth";

const cards = [
  {
    href: "/admin/documents",
    title: "Documents",
    desc: "Upload, delete, and reindex PDF documents for the RAG system.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    active: true,
  },
  {
    href: "#",
    title: "System Stats",
    desc: "View usage metrics, indexed documents, and query volumes.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    active: false,
  },
  {
    href: "#",
    title: "Users",
    desc: "Manage user accounts, roles, and access permissions.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
      </svg>
    ),
    active: false,
  },
  {
    href: "#",
    title: "Settings",
    desc: "Configure system preferences, API keys, and model settings.",
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      </svg>
    ),
    active: false,
  },
];

export default function AdminPage() {
  const { user, logout } = useAuth();

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="text-center">
          <h2 className="font-display text-2xl mb-3" style={{ color: "var(--text)" }}>Access Denied</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>
            You need admin privileges to access this page.
          </p>
          <Link href="/" className="text-sm transition-colors" style={{ color: "var(--accent)" }}>
            Go to sign in →
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
                <span className="text-gray-900 font-bold text-xs">RA</span>
              </div>
            </Link>
            <svg className="w-4 h-4" style={{ color: "var(--border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Admin</span>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="hidden sm:inline" style={{ color: "var(--text-muted)" }}>{user.email}</span>
            <Link
              href="/chat"
              className="transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              Chat
            </Link>
            <button
              onClick={logout}
              className="transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl mb-2" style={{ color: "var(--text)" }}>Admin Dashboard</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Manage documents, monitor the system, and configure settings.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {cards.map((card) => {
            const inner = (
              <div
                className="h-full p-6 rounded-xl border flex items-start gap-4 transition-all"
                style={{
                  backgroundColor: "var(--surface)",
                  borderColor: "var(--border)",
                }}
              >
                <div
                  className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                  style={{
                    backgroundColor: card.active ? "rgba(245,158,11,0.15)" : "var(--surface-2)",
                    color: card.active ? "var(--accent)" : "var(--text-muted)",
                  }}
                >
                  {card.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-medium text-sm" style={{ color: "var(--text)" }}>{card.title}</h3>
                    {!card.active && (
                      <span
                        className="text-xs px-1.5 py-0.5 rounded"
                        style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}
                      >
                        Soon
                      </span>
                    )}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>{card.desc}</p>
                </div>
              </div>
            );

            return card.active ? (
              <Link
                key={card.title}
                href={card.href}
                className="block group"
                style={{ borderRadius: "0.75rem" }}
                onMouseEnter={(e) => {
                  const inner = e.currentTarget.querySelector("div") as HTMLElement;
                  if (inner) { inner.style.borderColor = "var(--accent)"; inner.style.backgroundColor = "var(--surface-2)"; }
                }}
                onMouseLeave={(e) => {
                  const inner = e.currentTarget.querySelector("div") as HTMLElement;
                  if (inner) { inner.style.borderColor = "var(--border)"; inner.style.backgroundColor = "var(--surface)"; }
                }}
              >
                {inner}
              </Link>
            ) : (
              <div key={card.title} className="opacity-60 cursor-default">{inner}</div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
