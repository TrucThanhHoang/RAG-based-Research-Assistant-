"use client";

import Link from "next/link";
import { ReactNode } from "react";

interface NavLink {
  href: string;
  label: string;
}

interface NavbarProps {
  links?: NavLink[];
  rightContent?: ReactNode;
}

export function Navbar({ links = [], rightContent }: NavbarProps) {
  return (
    <header
      className="border-b"
      style={{ backgroundColor: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5 group">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: "var(--accent)" }}
          >
            <span className="text-gray-900 font-bold text-xs tracking-wider">RA</span>
          </div>
          <span
            className="font-semibold text-sm tracking-wide"
            style={{ color: "var(--text)" }}
          >
            Research Assistant
          </span>
        </Link>

        <div className="flex items-center gap-6">
          {links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-sm transition-colors"
              style={{ color: "var(--text-muted)" }}
              onMouseEnter={(e) => (e.currentTarget.style.color = "var(--text)")}
              onMouseLeave={(e) => (e.currentTarget.style.color = "var(--text-muted)")}
            >
              {link.label}
            </Link>
          ))}
          {rightContent}
        </div>
      </div>
    </header>
  );
}
