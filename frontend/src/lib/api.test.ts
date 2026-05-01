import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { deleteDocument, getMe, listDocuments, login, register, reindexDocument, sendChat, uploadDocument } from "@/lib/api";

const mockFetch = vi.fn();
vi.stubGlobal("fetch", mockFetch);

function mockOk(body: unknown, status = 200) {
  return {
    ok: true,
    status,
    json: () => Promise.resolve(body),
    text: () => Promise.resolve(""),
  };
}

function mockError(status: number, text: string) {
  return {
    ok: false,
    status,
    json: () => Promise.resolve({}),
    text: () => Promise.resolve(text),
  };
}

beforeEach(() => mockFetch.mockReset());

afterEach(() => vi.restoreAllMocks());

describe("login", () => {
  it("calls /auth/login and returns token response", async () => {
    const payload = { access_token: "tok", refresh_token: "ref", token_type: "bearer", user: { id: "1", email: "a@b.com", full_name: "A", is_admin: false, is_active: true } };
    mockFetch.mockResolvedValueOnce(mockOk(payload));

    const result = await login({ email: "a@b.com", password: "pass" });

    expect(mockFetch).toHaveBeenCalledOnce();
    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/login");
    expect(init.method).toBe("POST");
    expect(result.access_token).toBe("tok");
  });

  it("throws when server returns error", async () => {
    mockFetch.mockResolvedValueOnce(mockError(401, "Invalid credentials"));
    await expect(login({ email: "x@y.com", password: "bad" })).rejects.toThrow("Invalid credentials");
  });
});

describe("register", () => {
  it("calls /auth/register with full payload", async () => {
    const payload = { access_token: "tok", refresh_token: "ref", token_type: "bearer", user: { id: "2", email: "b@c.com", full_name: "B", is_admin: false, is_active: true } };
    mockFetch.mockResolvedValueOnce(mockOk(payload));

    await register({ email: "b@c.com", password: "secret", full_name: "B" });

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/auth/register");
    expect(JSON.parse(init.body as string)).toMatchObject({ email: "b@c.com", full_name: "B" });
  });
});

describe("getMe", () => {
  it("sends Authorization header", async () => {
    const user = { id: "1", email: "a@b.com", full_name: "A", is_admin: false, is_active: true };
    mockFetch.mockResolvedValueOnce(mockOk(user));

    await getMe("my-token");

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer my-token");
  });
});

describe("listDocuments", () => {
  it("returns document array", async () => {
    const docs = [{ id: "d1", filename: "paper.pdf", status: "indexed", chunk_count: 5 }];
    mockFetch.mockResolvedValueOnce(mockOk(docs));

    const result = await listDocuments("tok");
    expect(result).toHaveLength(1);
    expect(result[0].filename).toBe("paper.pdf");
  });
});

describe("deleteDocument", () => {
  it("sends DELETE and handles 204", async () => {
    mockFetch.mockResolvedValueOnce({ ok: true, status: 204, json: () => Promise.resolve({}), text: () => Promise.resolve("") });

    await expect(deleteDocument("tok", "doc-id")).resolves.toBeUndefined();

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/documents/doc-id");
    expect(init.method).toBe("DELETE");
  });
});

describe("uploadDocument", () => {
  it("sends FormData with file", async () => {
    const doc = { id: "d2", filename: "new.pdf", status: "pending", chunk_count: 0 };
    mockFetch.mockResolvedValueOnce(mockOk(doc));

    const file = new File(["content"], "new.pdf", { type: "application/pdf" });
    const result = await uploadDocument("tok", file);

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/documents/upload");
    expect(init.body).toBeInstanceOf(FormData);
    expect(result.id).toBe("d2");
  });
});

describe("reindexDocument", () => {
  it("sends POST to reindex endpoint", async () => {
    const doc = { id: "d1", filename: "paper.pdf", status: "indexed", chunk_count: 10 };
    mockFetch.mockResolvedValueOnce(mockOk(doc));

    const result = await reindexDocument("tok", "d1");

    const [url, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(url).toContain("/documents/d1/reindex");
    expect(init.method).toBe("POST");
    expect(result.chunk_count).toBe(10);
  });
});

describe("sendChat", () => {
  it("sends message and returns chat response with citations", async () => {
    const chatRes = { session_id: "sess-1", answer: "Paris", citations: [{ document_id: "d1", filename: "geo.pdf", chunk_index: 0, snippet: "Paris is..." }] };
    mockFetch.mockResolvedValueOnce(mockOk(chatRes));

    const result = await sendChat("tok", { message: "What is the capital?" });

    expect(result.answer).toBe("Paris");
    expect(result.citations).toHaveLength(1);
  });

  it("forwards session_id when provided", async () => {
    mockFetch.mockResolvedValueOnce(mockOk({ session_id: "s2", answer: "ok", citations: [] }));

    await sendChat("tok", { session_id: "s2", message: "follow-up" });

    const [, init] = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(JSON.parse(init.body as string)).toMatchObject({ session_id: "s2" });
  });
});
