"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { deleteDocument, listDocuments, reindexDocument, uploadDocumentWithProgress } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Document } from "@/lib/types";

const MAX_FILE_MB = 50;

function StatusBadge({ status }: { status: string }) {
  const colors: Record<string, { dot: string; text: string; bg: string }> = {
    indexed: { dot: "#10b981", text: "#6ee7b7", bg: "rgba(16,185,129,0.1)" },
    failed:  { dot: "#ef4444", text: "#fca5a5", bg: "rgba(239,68,68,0.1)" },
    pending: { dot: "#f59e0b", text: "#fcd34d", bg: "rgba(245,158,11,0.1)" },
  };
  const c = colors[status] ?? colors["pending"];
  return (
    <span
      className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full font-medium"
      style={{ backgroundColor: c.bg, color: c.text }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${status === "pending" ? "animate-pulse" : ""}`}
        style={{ backgroundColor: c.dot }}
      />
      {status}
    </span>
  );
}

export default function AdminDocumentsPage() {
  const { token, user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "indexing" | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    try {
      setDocuments(await listDocuments(token));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load documents");
    }
  }, [token]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  // Auto-poll while any document is pending
  useEffect(() => {
    const hasPending = documents.some((d) => d.status === "pending");
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(() => { loadDocuments(); }, 3000);
    } else if (!hasPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => {
      if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; }
    };
  }, [documents, loadDocuments]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedFile) return;

    if (selectedFile.size > MAX_FILE_MB * 1024 * 1024) {
      setError(`File too large. Maximum size is ${MAX_FILE_MB} MB.`);
      return;
    }

    setError(null);
    setUploadProgress(0);
    setUploadPhase("uploading");

    try {
      const doc = await uploadDocumentWithProgress(token, selectedFile, (pct) => {
        setUploadProgress(pct);
        if (pct === 100) setUploadPhase("indexing");
      });
      setDocuments((prev) => [doc, ...prev]);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadProgress(null);
      setUploadPhase(null);
    }
  }

  async function onDelete(documentId: string) {
    if (!token || !confirm("Delete this document? This cannot be undone.")) return;
    try {
      await deleteDocument(token, documentId);
      setDocuments((prev) => prev.filter((d) => d.id !== documentId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Delete failed");
    }
  }

  async function onReindex(documentId: string) {
    if (!token) return;
    try {
      const updated = await reindexDocument(token, documentId);
      setDocuments((prev) => prev.map((d) => (d.id === documentId ? updated : d)));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reindex failed");
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      setSelectedFile(file);
      setError(null);
    } else {
      setError("Only PDF files are accepted.");
    }
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0] ?? null;
    if (file && file.type !== "application/pdf") {
      setError("Only PDF files are accepted.");
      return;
    }
    setSelectedFile(file);
    setError(null);
  }

  if (!user?.is_admin) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="text-center">
          <h2 className="font-display text-2xl mb-3" style={{ color: "var(--text)" }}>Access Denied</h2>
          <p className="text-sm mb-4" style={{ color: "var(--text-muted)" }}>You need admin privileges.</p>
          <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>Go to sign in →</Link>
        </div>
      </div>
    );
  }

  const isUploading = uploadPhase !== null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
                <span className="text-gray-900 font-bold text-xs">RA</span>
              </div>
            </Link>
            <svg className="w-4 h-4" style={{ color: "var(--border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <Link href="/admin" className="text-sm transition-colors" style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >Admin</Link>
            <svg className="w-4 h-4" style={{ color: "var(--border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>Documents</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/chat" className="transition-colors" style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >Chat</Link>
            <button onClick={logout} className="transition-colors" style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl mb-2" style={{ color: "var(--text)" }}>Document Management</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Upload PDF documents (max {MAX_FILE_MB} MB each) to the RAG knowledge base.
          </p>
        </div>

        {/* Upload zone */}
        <form
          onSubmit={onUpload}
          className="rounded-xl border-2 border-dashed p-8 mb-8 transition-colors"
          style={{
            borderColor: dragOver ? "var(--accent)" : selectedFile ? "rgba(245,158,11,0.4)" : "var(--border)",
            backgroundColor: dragOver ? "rgba(245,158,11,0.05)" : "var(--surface)",
          }}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
        >
          <div className="flex flex-col sm:flex-row items-center gap-6">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--accent)" }}>
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div className="flex-1 text-center sm:text-left">
              {selectedFile ? (
                <>
                  <p className="font-medium text-sm mb-0.5" style={{ color: "var(--text)" }}>{selectedFile.name}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                    {selectedFile.size > MAX_FILE_MB * 1024 * 1024 && (
                      <span className="ml-2" style={{ color: "var(--error)" }}>— exceeds {MAX_FILE_MB} MB limit</span>
                    )}
                  </p>
                </>
              ) : (
                <>
                  <p className="font-medium text-sm mb-0.5" style={{ color: "var(--text)" }}>
                    Drop a PDF here or{" "}
                    <button type="button" onClick={() => fileInputRef.current?.click()}
                      className="underline" style={{ color: "var(--accent)" }}>browse</button>
                  </p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>PDF only · max {MAX_FILE_MB} MB</p>
                </>
              )}
            </div>
            <div className="flex items-center gap-3">
              {selectedFile && !isUploading && (
                <button type="button"
                  onClick={() => { setSelectedFile(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>Clear</button>
              )}
              <button type="submit" disabled={!selectedFile || isUploading}
                className="text-sm font-medium px-5 py-2 rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                style={{ backgroundColor: "var(--accent)", color: "#111827" }}
                onMouseEnter={(e) => !e.currentTarget.disabled && (e.currentTarget.style.backgroundColor = "var(--accent-hover)")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "var(--accent)")}
              >
                {isUploading ? (uploadPhase === "indexing" ? "Indexing..." : "Uploading...") : "Upload & Index"}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="mt-5">
              <div className="flex justify-between text-xs mb-1.5" style={{ color: "var(--text-muted)" }}>
                <span className="flex items-center gap-1.5">
                  {uploadPhase === "indexing" ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" style={{ color: "var(--accent)" }} fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Indexing document (vectorizing chunks)...
                    </>
                  ) : (
                    <>Uploading file...</>
                  )}
                </span>
                {uploadPhase === "uploading" && <span>{uploadProgress}%</span>}
              </div>
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                {uploadPhase === "uploading" ? (
                  <div className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent)" }} />
                ) : (
                  <div className="h-full rounded-full animate-pulse"
                    style={{ width: "100%", backgroundColor: "var(--accent)", opacity: 0.6 }} />
                )}
              </div>
            </div>
          )}

          {error && <p className="mt-3 text-xs flex items-center gap-1.5" style={{ color: "var(--error)" }}>
            <svg className="w-3.5 h-3.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            {error}
          </p>}
          <input ref={fileInputRef} type="file" accept="application/pdf" onChange={handleFileChange} className="hidden" />
        </form>

        {/* Documents list */}
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>
              {documents.length} document{documents.length !== 1 ? "s" : ""}
              {documents.some(d => d.status === "pending") && (
                <span className="ml-2 text-xs" style={{ color: "var(--accent)" }}>· auto-refreshing</span>
              )}
            </h2>
          </div>

          {documents.length === 0 ? (
            <div className="rounded-xl border py-16 text-center"
              style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
              <svg className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>No documents uploaded yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {documents.map((doc) => (
                <div key={doc.id} className="rounded-xl border px-5 py-4 flex items-center gap-4"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                    style={{ backgroundColor: "var(--surface-2)", color: "var(--text-muted)" }}>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate mb-1" style={{ color: "var(--text)" }}>{doc.filename}</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      <StatusBadge status={doc.status} />
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {doc.chunk_count} chunk{doc.chunk_count !== 1 ? "s" : ""}
                      </span>
                      <span className="text-xs" style={{ color: "var(--text-muted)" }}>
                        {new Date(doc.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <button onClick={() => onReindex(doc.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = "var(--text-muted)"; e.currentTarget.style.color = "var(--text)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = "var(--border)"; e.currentTarget.style.color = "var(--text-muted)"; }}
                    >Reindex</button>
                    <button onClick={() => onDelete(doc.id)}
                      className="text-xs px-3 py-1.5 rounded-lg border transition-colors"
                      style={{ borderColor: "rgba(239,68,68,0.3)", color: "#fca5a5", backgroundColor: "rgba(239,68,68,0.05)" }}
                      onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.15)"; }}
                      onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "rgba(239,68,68,0.05)"; }}
                    >Delete</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
