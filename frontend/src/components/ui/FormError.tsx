"use client";

import { useEffect, useState } from "react";

interface FormErrorProps {
  message: string | null | undefined;
  id?: string;
  className?: string;
}

export function FormError({ message, id, className }: FormErrorProps) {
  const [shakeKey, setShakeKey] = useState(0);

  useEffect(() => {
    if (message) setShakeKey((k) => k + 1);
  }, [message]);

  if (!message) return null;

  return (
    <p
      key={shakeKey}
      id={id}
      role="alert"
      aria-live="polite"
      className={`form-error-shake flex items-start gap-1.5 text-xs leading-relaxed ${className ?? ""}`}
      style={{ color: "var(--error-soft)" }}
    >
      <svg
        className="w-3.5 h-3.5 flex-shrink-0 mt-0.5"
        fill="currentColor"
        viewBox="0 0 20 20"
        aria-hidden="true"
      >
        <path
          fillRule="evenodd"
          d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
          clipRule="evenodd"
        />
      </svg>
      <span>{message}</span>
    </p>
  );
}
