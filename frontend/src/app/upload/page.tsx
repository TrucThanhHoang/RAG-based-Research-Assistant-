"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";

import { listDocuments, uploadDocumentWithProgress, APIError } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Document } from "@/lib/types";
import { FormError } from "@/components/ui/FormError";
import { notify } from "@/lib/toast";

const MAX_FILE_MB = 50;

function StatusDot({ status }: { status: string }) {
  const map: Record<string, string> = { indexed: "#10b981", failed: "#ef4444", pending: "#f59e0b" };
  const color = map[status] ?? map["pending"];
  return (
    <span className={`inline-block w-2 h-2 rounded-full ${status === "pending" ? "animate-pulse" : ""}`}
      style={{ backgroundColor: color }} />
  );
}

function getUploadErrorMessage(err: unknown): string {
  if (err instanceof APIError) {
    if (err.status === 409) return "This document has already been uploaded.";
    if (err.status === 413) return `File is too large. Maximum size is ${MAX_FILE_MB} MB.`;
    if (err.status === 400) return err.detail || "Invalid file. Please upload a valid PDF.";
    return err.detail || "Upload failed. Please try again.";
  }
  return err instanceof Error ? err.message : "Upload failed. Please try again.";
}

export default function UploadPage() {
  const { token, user, logout } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadPhase, setUploadPhase] = useState<"uploading" | "indexing" | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!token) return;
    try {
      setDocuments(await listDocuments(token));
    } catch (err) {
      const message = err instanceof Error ? err.message : "Network error";
      notify.error("Could not load documents", { description: message, id: "load-docs" });
    }
  }, [token]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  useEffect(() => {
    const hasPending = documents.some((d) => d.status === "pending");
    if (hasPending && !pollingRef.current) {
      pollingRef.current = setInterval(loadDocuments, 3000);
    } else if (!hasPending && pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
    return () => { if (pollingRef.current) { clearInterval(pollingRef.current); pollingRef.current = null; } };
  }, [documents, loadDocuments]);

  async function onUpload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!token || !selectedFile) return;
    if (selectedFile.size > MAX_FILE_MB * 1024 * 1024) {
      setValidationError(`File too large. Max is ${MAX_FILE_MB} MB.`);
      return;
    }
    setValidationError(null);
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
      notify.success("Document uploaded", {
        description: `${doc.filename} is being indexed — this may take a moment.`,
      });
    } catch (err) {
      notify.error("Upload failed", { description: getUploadErrorMessage(err) });
    } finally {
      setUploadProgress(null);
      setUploadPhase(null);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file?.type === "application/pdf") {
      setSelectedFile(file);
      setValidationError(null);
    } else {
      setValidationError("Only PDF files are accepted.");
    }
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: "var(--bg)" }}>
        <div className="text-center">
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>Please sign in first.</p>
          <Link href="/" className="text-sm" style={{ color: "var(--accent)" }}>Sign in →</Link>
        </div>
      </div>
    );
  }

  const isUploading = uploadPhase !== null;

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--bg)" }}>
      {/* Header */}
      <header className="border-b" style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
        <div className="max-w-5xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: "var(--accent)" }}>
                <span className="text-gray-900 font-bold text-xs">RA</span>
              </div>
            </Link>
            <svg className="w-4 h-4" style={{ color: "var(--border)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
            <span className="text-sm font-medium" style={{ color: "var(--text-muted)" }}>My Documents</span>
          </div>
          <div className="flex items-center gap-4 text-sm">
            <Link href="/chat" className="nav-link">Chat</Link>
            {user.is_admin && <Link href="/admin" className="nav-link">Admin</Link>}
            <button onClick={logout} className="nav-link">Logout</button>
          </div>
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="font-display text-4xl mb-2" style={{ color: "var(--text)" }}>My Documents</h1>
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            Upload your research PDFs. Once indexed, head to{" "}
            <Link href="/chat" className="underline" style={{ color: "var(--accent)" }}>Chat</Link> to ask questions.
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
          <div className="flex flex-col items-center text-center gap-4">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: "var(--surface-2)", color: "var(--accent)" }}>
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>

            {selectedFile ? (
              <div>
                <p className="font-medium text-sm" style={{ color: "var(--text)" }}>{selectedFile.name}</p>
                <p className="text-xs mt-0.5" style={{ color: "var(--text-muted)" }}>
                  {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
                </p>
              </div>
            ) : (
              <div>
                <p className="font-medium text-sm mb-1" style={{ color: "var(--text)" }}>
                  Drag & drop your PDF here
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  or{" "}
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="underline" style={{ color: "var(--accent)" }}>browse files</button>
                  {" "}· PDF only · max {MAX_FILE_MB} MB
                </p>
              </div>
            )}

            <div className="flex gap-3">
              {selectedFile && !isUploading && (
                <button type="button"
                  onClick={() => { setSelectedFile(null); setValidationError(null); if (fileInputRef.current) fileInputRef.current.value = ""; }}
                  className="text-xs px-4 py-2 rounded-lg border"
                  style={{ borderColor: "var(--border)", color: "var(--text-muted)" }}>
                  Clear
                </button>
              )}
              <button type="submit" disabled={!selectedFile || isUploading}
                className="text-sm font-medium px-6 py-2 rounded-lg transition-colors disabled:opacity-40"
                style={{ backgroundColor: "var(--accent)", color: "#111827" }}
              >
                {isUploading ? (uploadPhase === "indexing" ? "Indexing..." : `Uploading ${uploadProgress}%`) : "Upload & Index"}
              </button>
            </div>
          </div>

          {/* Progress bar */}
          {isUploading && (
            <div className="mt-6">
              <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--surface-2)" }}>
                {uploadPhase === "uploading" ? (
                  <div className="h-full rounded-full transition-all duration-200"
                    style={{ width: `${uploadProgress}%`, backgroundColor: "var(--accent)" }} />
                ) : (
                  <div className="h-full w-full rounded-full animate-pulse"
                    style={{ backgroundColor: "var(--accent)", opacity: 0.7 }} />
                )}
              </div>
              <p className="text-xs mt-2 text-center" style={{ color: "var(--text-muted)" }}>
                {uploadPhase === "indexing" ? "Vectorizing document chunks — this may take a moment..." : "Uploading file..."}
              </p>
            </div>
          )}

          {validationError && (
            <div className="mt-4 flex justify-center">
              <FormError message={validationError} />
            </div>
          )}
          <input ref={fileInputRef} type="file" accept="application/pdf"
            onChange={(e) => { const f = e.target.files?.[0] ?? null; setSelectedFile(f); setValidationError(null); }}
            className="hidden" />
        </form>

        {/* Documents list */}
        {documents.length > 0 && (
          <div>
            <h2 className="text-sm font-medium mb-4" style={{ color: "var(--text-muted)" }}>
              {documents.length} document{documents.length !== 1 ? "s" : ""}
              {documents.some(d => d.status === "pending") && (
                <span className="ml-2" style={{ color: "var(--accent)" }}>· indexing in progress</span>
              )}
            </h2>
            <div className="space-y-2">
              {documents.map((doc) => (
                <div key={doc.id} className="flex items-center gap-4 rounded-xl px-4 py-3 border"
                  style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}>
                  <svg className="w-4 h-4 flex-shrink-0" style={{ color: "var(--text-muted)" }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                  <span className="flex-1 text-sm truncate" style={{ color: "var(--text)" }}>{doc.filename}</span>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <StatusDot status={doc.status} />
                    <span className="text-xs" style={{ color: "var(--text-muted)" }}>{doc.status}</span>
                  </div>
                  {doc.status === "indexed" && (
                    <Link href="/chat"
                      className="text-xs px-3 py-1 rounded-lg transition-colors"
                      style={{ backgroundColor: "rgba(245,158,11,0.15)", color: "var(--accent)" }}>
                      Ask →
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
