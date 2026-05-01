import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import * as api from "@/lib/api";
import { AuthProvider, useAuth } from "@/lib/auth";

vi.mock("@/lib/api");

const mockGetMe = vi.mocked(api.getMe);
const mockLogin = vi.mocked(api.login);
const mockRegister = vi.mocked(api.register);

const fakeUser = { id: "1", email: "a@b.com", full_name: "Alice", is_admin: false, is_active: true };
const fakeTokenResponse = { access_token: "acc", refresh_token: "ref", token_type: "bearer", user: fakeUser };

beforeEach(() => {
  localStorage.clear();
  vi.resetAllMocks();
});

function wrapper({ children }: { children: React.ReactNode }) {
  return <AuthProvider>{children}</AuthProvider>;
}

describe("useAuth — initial state (no stored session)", () => {
  it("starts with null token and user after loading", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});

describe("useAuth — restores session from localStorage", () => {
  it("loads token and validates with getMe", async () => {
    localStorage.setItem("rag-auth", JSON.stringify(fakeTokenResponse));
    mockGetMe.mockResolvedValueOnce(fakeUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.token).toBe("acc");
    expect(result.current.user?.email).toBe("a@b.com");
    expect(mockGetMe).toHaveBeenCalledWith("acc");
  });

  it("clears session when getMe fails (expired token)", async () => {
    localStorage.setItem("rag-auth", JSON.stringify(fakeTokenResponse));
    mockGetMe.mockRejectedValueOnce(new Error("401"));

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.token).toBeNull();
    expect(localStorage.getItem("rag-auth")).toBeNull();
  });
});

describe("loginWithPassword", () => {
  it("sets token and user after successful login", async () => {
    mockGetMe.mockResolvedValueOnce(fakeUser);
    localStorage.setItem("rag-auth", JSON.stringify(fakeTokenResponse));
    mockLogin.mockResolvedValueOnce(fakeTokenResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockLogin.mockResolvedValueOnce(fakeTokenResponse);
    await act(async () => {
      await result.current.loginWithPassword({ email: "a@b.com", password: "pass" });
    });

    expect(result.current.token).toBe("acc");
    expect(result.current.user?.email).toBe("a@b.com");
    expect(localStorage.getItem("rag-auth")).not.toBeNull();
  });

  it("does not update state on login failure", async () => {
    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    mockLogin.mockRejectedValueOnce(new Error("Invalid credentials"));

    await act(async () => {
      try {
        await result.current.loginWithPassword({ email: "x@y.com", password: "bad" });
      } catch {
        // expected
      }
    });

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
  });
});

describe("logout", () => {
  it("clears token, user, and localStorage", async () => {
    localStorage.setItem("rag-auth", JSON.stringify(fakeTokenResponse));
    mockGetMe.mockResolvedValueOnce(fakeUser);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    act(() => result.current.logout());

    expect(result.current.token).toBeNull();
    expect(result.current.user).toBeNull();
    expect(localStorage.getItem("rag-auth")).toBeNull();
  });
});

describe("registerUser", () => {
  it("calls register API and sets auth state", async () => {
    mockRegister.mockResolvedValueOnce(fakeTokenResponse);

    const { result } = renderHook(() => useAuth(), { wrapper });
    await waitFor(() => expect(result.current.loading).toBe(false));

    await act(async () => {
      await result.current.registerUser({ email: "new@user.com", password: "pass123", full_name: "New User" });
    });

    expect(result.current.token).toBe("acc");
    expect(mockRegister).toHaveBeenCalledWith({ email: "new@user.com", password: "pass123", full_name: "New User" });
  });
});
