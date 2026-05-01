"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";

import { deleteDocument, listDocuments, reindexDocument, uploadDocument } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { Document } from "@/lib/types";

export function DocumentManager() {
  const { token, user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadDocuments = useCallback(async () => {
    if (!token) {
      return;
    }

    try {
      const nextDocuments = await listDocuments(token);
      setDocuments(nextDocuments);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load documents");
    }
  }, [token]);

  useEffect(() => {
    loadDocuments();
  }, [loadDocuments]);

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!token || !selectedFile) {
      return;
    }

    setError(null);
    try {
      const document = await uploadDocument(token, selectedFile);
      setDocuments((current) => [document, ...current]);
      setSelectedFile(null);
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed");
    }
  }

  async function onDelete(documentId: string) {
    if (!token) {
      return;
    }

    await deleteDocument(token, documentId);
    setDocuments((current) => current.filter((document) => document.id !== documentId));
  }

  async function onReindex(documentId: string) {
    if (!token) {
      return;
    }

    const updated = await reindexDocument(token, documentId);
    setDocuments((current) => current.map((document) => (document.id === documentId ? updated : document)));
  }

  if (!user?.is_admin) {
    return <p>Admin access is required.</p>;
  }

  return (
    <section style={{ display: "grid", gap: 20 }}>
      <form onSubmit={onUpload} style={{ display: "grid", gap: 12, padding: 20, border: "1px solid #334155", borderRadius: 16 }}>
        <h2 style={{ margin: 0 }}>Upload PDF</h2>
        <input type="file" accept="application/pdf" onChange={(event) => setSelectedFile(event.target.files?.[0] ?? null)} />
        <button type="submit">Upload and index</button>
        {error ? <p style={{ color: "#fca5a5" }}>{error}</p> : null}
      </form>

      <div style={{ display: "grid", gap: 12 }}>
        {documents.map((document) => (
          <article key={document.id} style={{ padding: 16, border: "1px solid #334155", borderRadius: 16 }}>
            <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center" }}>
              <div>
                <strong>{document.filename}</strong>
                <p style={{ margin: "6px 0 0", color: "#cbd5e1" }}>
                  Status: {document.status} · Chunks: {document.chunk_count}
                </p>
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button type="button" onClick={() => onReindex(document.id)}>Reindex</button>
                <button type="button" onClick={() => onDelete(document.id)}>Delete</button>
              </div>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
