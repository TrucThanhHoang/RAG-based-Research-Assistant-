"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/lib/auth";
import { FormError } from "@/components/ui/FormError";
import { notify } from "@/lib/toast";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD_LENGTH = 8;

interface FieldErrors {
  email?: string;
  password?: string;
  fullName?: string;
}

function validate(
  mode: "login" | "register",
  values: { email: string; password: string; fullName: string },
): FieldErrors {
  const errors: FieldErrors = {};
  if (!values.email) errors.email = "Email is required.";
  else if (!EMAIL_REGEX.test(values.email)) errors.email = "Please enter a valid email address.";

  if (!values.password) errors.password = "Password is required.";
  else if (values.password.length < MIN_PASSWORD_LENGTH)
    errors.password = `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`;

  if (mode === "register" && !values.fullName.trim()) errors.fullName = "Full name is required.";

  return errors;
}

export function AuthForms() {
  const { loginWithPassword, registerUser, loading, user } = useAuth();
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);

  function clearErrors() {
    setFieldErrors({});
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validate(mode, { email, password, fullName });
    if (Object.keys(errors).length > 0) {
      setFieldErrors(errors);
      return;
    }
    setFieldErrors({});
    setSubmitting(true);

    try {
      if (mode === "login") {
        await loginWithPassword({ email, password });
        notify.success("Welcome back", { description: "Redirecting you to your workspace..." });
      } else {
        await registerUser({ email, password, full_name: fullName });
        notify.success("Account created", { description: "You're all set — let's go." });
      }
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : "Authentication failed";
      notify.error(mode === "login" ? "Sign in failed" : "Registration failed", { description: message });
    } finally {
      setSubmitting(false);
    }
  }

  useEffect(() => {
    if (!loading && user) {
      router.push(user.is_admin ? "/admin" : "/chat");
    }
  }, [user, loading, router]);

  if (loading || user) {
    return (
      <div className="flex items-center gap-2" style={{ color: "var(--text-muted)" }}>
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
        <span className="text-sm">Redirecting...</span>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      {/* Tab switcher */}
      <div className="flex mb-8 border-b border-[var(--border)]">
        <button
          type="button"
          onClick={() => { setMode("login"); clearErrors(); }}
          className={`pb-3 px-1 mr-6 text-sm font-medium transition-colors border-b-2 -mb-px ${
            mode === "login"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Sign in
        </button>
        <button
          type="button"
          onClick={() => { setMode("register"); clearErrors(); }}
          role="tab"
          aria-label="register"
          className={`pb-3 px-1 text-sm font-medium transition-colors border-b-2 -mb-px ${
            mode === "register"
              ? "border-[var(--accent)] text-[var(--accent)]"
              : "border-transparent text-[var(--text-muted)] hover:text-[var(--text)]"
          }`}
        >
          Register
        </button>
      </div>

      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {mode === "register" && (
          <div>
            <label htmlFor="full-name" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
              Full name
            </label>
            <input
              id="full-name"
              type="text"
              placeholder="Alice Johnson"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                if (fieldErrors.fullName) setFieldErrors((p) => ({ ...p, fullName: undefined }));
              }}
              aria-invalid={Boolean(fieldErrors.fullName)}
              aria-describedby={fieldErrors.fullName ? "full-name-error" : undefined}
              className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-1 transition-colors ${
                fieldErrors.fullName
                  ? "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]"
                  : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]"
              }`}
            />
            <div className="mt-1.5">
              <FormError id="full-name-error" message={fieldErrors.fullName} />
            </div>
          </div>
        )}

        <div>
          <label htmlFor="email" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
            Email
          </label>
          <input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.email)}
            aria-describedby={fieldErrors.email ? "email-error" : undefined}
            className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-1 transition-colors ${
              fieldErrors.email
                ? "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]"
                : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]"
            }`}
          />
          <div className="mt-1.5">
            <FormError id="email-error" message={fieldErrors.email} />
          </div>
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-[var(--text-muted)] mb-1.5 uppercase tracking-wider">
            Password
          </label>
          <input
            id="password"
            type="password"
            placeholder={mode === "register" ? `At least ${MIN_PASSWORD_LENGTH} characters` : "••••••••"}
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }));
            }}
            aria-invalid={Boolean(fieldErrors.password)}
            aria-describedby={fieldErrors.password ? "password-error" : undefined}
            className={`w-full px-4 py-3 rounded-lg bg-[var(--surface-2)] border text-[var(--text)] placeholder-[var(--text-muted)] text-sm focus:outline-none focus:ring-1 transition-colors ${
              fieldErrors.password
                ? "border-[var(--error)] focus:border-[var(--error)] focus:ring-[var(--error)]"
                : "border-[var(--border)] focus:border-[var(--accent)] focus:ring-[var(--accent)]"
            }`}
          />
          <div className="mt-1.5">
            <FormError id="password-error" message={fieldErrors.password} />
          </div>
        </div>

        <button
          type="submit"
          disabled={submitting}
          className="w-full py-3 px-4 mt-2 rounded-lg bg-[var(--accent)] hover:bg-[var(--accent-hover)] text-gray-900 font-semibold text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {submitting ? (
            <>
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              {mode === "login" ? "Signing in..." : "Creating account..."}
            </>
          ) : (
            mode === "login" ? "Sign in" : "Create account"
          )}
        </button>
      </form>
    </div>
  );
}
