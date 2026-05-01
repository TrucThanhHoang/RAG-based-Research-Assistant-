"use client";

import Link from "next/link";
import { ReactNode } from "react";

type EmptyStateAction =
  | { label: string; href: string; onClick?: never }
  | { label: string; onClick: () => void; href?: never };

interface EmptyStateProps {
  icon: ReactNode;
  title: string;
  description: string;
  action?: EmptyStateAction;
  variant?: "default" | "error";
  className?: string;
}

export function EmptyState({
  icon,
  title,
  description,
  action,
  variant = "default",
  className,
}: EmptyStateProps) {
  const accentColor = variant === "error" ? "var(--error)" : "var(--accent)";
  const iconBg =
    variant === "error" ? "rgba(239,68,68,0.12)" : "var(--surface-2)";

  return (
    <div
      className={`flex flex-col items-center justify-center text-center px-6 py-12 ${className ?? ""}`}
    >
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ backgroundColor: iconBg, color: accentColor }}
      >
        {icon}
      </div>
      <h3
        className="font-display text-xl mb-2"
        style={{ color: "var(--text)" }}
      >
        {title}
      </h3>
      <p
        className="text-sm max-w-sm leading-relaxed"
        style={{ color: "var(--text-muted)" }}
      >
        {description}
      </p>

      {action && (
        <div className="mt-6">
          {action.href ? (
            <Link
              href={action.href}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--accent-hover)]"
              style={{ backgroundColor: accentColor, color: "#111827" }}
            >
              {action.label}
            </Link>
          ) : (
            <button
              type="button"
              onClick={action.onClick}
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-medium transition-colors hover:bg-[var(--accent-hover)]"
              style={{ backgroundColor: accentColor, color: "#111827" }}
            >
              {action.label}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
