"use client";

import { AuthForms } from "@/components/auth/AuthForms";

const features = [
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    ),
    title: "Semantic document search",
    desc: "Upload PDFs and retrieve relevant passages instantly using vector embeddings.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
      </svg>
    ),
    title: "Cited answers",
    desc: "Every response references the exact source document and passage it came from.",
  },
  {
    icon: (
      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    ),
    title: "Multi-model AI",
    desc: "Choose between Gemini 1.5 Flash, Claude Sonnet 4, or GPT-4o Mini — all grounded in your documents.",
  },
];

export default function HomePage() {
  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--bg)" }}>
      {/* Left branding panel — hidden on mobile */}
      <div
        className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden"
        style={{ backgroundColor: "var(--surface)", borderRight: "1px solid var(--border)" }}
      >
        {/* Background geometric accent */}
        <div
          className="absolute -top-32 -right-32 w-96 h-96 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, var(--accent), transparent)" }}
        />
        <div
          className="absolute -bottom-20 -left-20 w-64 h-64 rounded-full opacity-5"
          style={{ background: "radial-gradient(circle, var(--accent), transparent)" }}
        />

        {/* Logo */}
        <div className="flex items-center gap-3 relative z-10">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <span className="text-gray-900 font-bold text-xs tracking-wider">RA</span>
          </div>
          <span className="font-medium text-sm" style={{ color: "var(--text)" }}>Research Assistant</span>
        </div>

        {/* Headline */}
        <div className="relative z-10">
          <h1
            className="font-display text-5xl leading-[1.15] mb-6"
            style={{ color: "var(--text)" }}
          >
            Your papers,
            <br />
            <em style={{ color: "var(--accent)" }}>answered.</em>
          </h1>
          <p className="text-base mb-12" style={{ color: "var(--text-muted)" }}>
            Upload research PDFs and ask questions. Get precise answers with citations directly
            from your documents — powered by RAG and multi-model AI.
          </p>

          <div className="space-y-5">
            {features.map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5"
                  style={{ backgroundColor: "var(--surface-2)", color: "var(--accent)" }}
                >
                  {f.icon}
                </div>
                <div>
                  <div className="text-sm font-medium mb-0.5" style={{ color: "var(--text)" }}>
                    {f.title}
                  </div>
                  <div className="text-xs leading-relaxed" style={{ color: "var(--text-muted)" }}>
                    {f.desc}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <p className="text-xs relative z-10" style={{ color: "var(--text-muted)" }}>
          Built with Next.js · FastAPI · ChromaDB
        </p>
      </div>

      {/* Right auth panel */}
      <div className="flex-1 flex flex-col items-center justify-center px-8 py-12">
        {/* Mobile logo */}
        <div className="flex lg:hidden items-center gap-2.5 mb-10">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <span className="text-gray-900 font-bold text-xs">RA</span>
          </div>
          <span className="font-semibold text-sm" style={{ color: "var(--text)" }}>Research Assistant</span>
        </div>

        <div className="w-full max-w-sm relative">
          {/* Ambient glow */}
          <div
            className="absolute inset-0 -z-10 rounded-2xl opacity-25 blur-3xl pointer-events-none"
            style={{ background: "radial-gradient(ellipse at 50% 90%, var(--accent), transparent 70%)" }}
          />
          <h2
            className="font-display text-2xl mb-2"
            style={{ color: "var(--text)" }}
          >
            Welcome back
          </h2>
          <p className="text-sm mb-8" style={{ color: "var(--text-muted)" }}>
            Sign in to your account or create a new one.
          </p>
          <AuthForms />
        </div>
      </div>
    </div>
  );
}
