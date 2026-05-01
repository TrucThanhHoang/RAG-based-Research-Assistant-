import { ChatResponse, ChatSession, Document, TokenResponse } from "@/lib/types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api";

export class APIError extends Error {
  constructor(
    message: string,
    public status: number,
    public detail?: string
  ) {
    super(message);
    this.name = "APIError";
  }
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
    },
    cache: "no-store",
  });

  if (!response.ok) {
    const text = await response.text();
    let detail = text;
    try {
      const json = JSON.parse(text);
      detail = json.detail || text;
    } catch {}

    throw new APIError(
      `Request failed: ${response.status}`,
      response.status,
      detail
    );
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json() as Promise<T>;
}

export async function register(payload: { email: string; password: string; full_name: string }) {
  return request<TokenResponse>("/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function login(payload: { email: string; password: string }) {
  return request<TokenResponse>("/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
}

export async function getMe(token: string) {
  return request<TokenResponse["user"]>("/auth/me", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function listDocuments(token: string) {
  return request<Document[]>("/documents", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function uploadDocument(token: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);

  return request<Document>("/documents/upload", {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
}

/** Upload with XHR for progress tracking. onProgress(0–100). */
export function uploadDocumentWithProgress(
  token: string,
  file: File,
  onProgress: (pct: number) => void,
): Promise<Document> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);

    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    });

    xhr.addEventListener("load", () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          resolve(JSON.parse(xhr.responseText) as Document);
        } catch {
          reject(new Error("Invalid response from server"));
        }
      } else {
        reject(new Error(xhr.responseText || `Upload failed: ${xhr.status}`));
      }
    });

    xhr.addEventListener("error", () => reject(new Error("Network error during upload")));
    xhr.addEventListener("abort", () => reject(new Error("Upload cancelled")));

    xhr.open("POST", `${API_URL}/documents/upload`);
    xhr.setRequestHeader("Authorization", `Bearer ${token}`);
    xhr.send(formData);
  });
}

export async function deleteDocument(token: string, documentId: string) {
  await request<void>(`/documents/${documentId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function reindexDocument(token: string, documentId: string) {
  return request<Document>(`/documents/${documentId}/reindex`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function sendChat(token: string, payload: { session_id?: string; message: string; model?: string }) {
  return request<ChatResponse>("/chat", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
}

export async function getChatSessions(token: string) {
  return request<ChatSession[]>("/chat/sessions", {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function getChatHistory(token: string, sessionId: string) {
  return request<ChatSession>(`/chat/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${token}` },
  });
}

export async function deleteSession(token: string, sessionId: string) {
  await request<void>(`/chat/sessions/${sessionId}`, {
    method: "DELETE",
    headers: { Authorization: `Bearer ${token}` },
  });
}

export function getDocumentFileUrl(documentId: string): string {
  return `${API_URL}/documents/${documentId}/file`;
}
