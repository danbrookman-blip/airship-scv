"use client";

import { useEffect } from "react";

/** Lightweight centred modal. Closes on Escape or backdrop click. */
export function Modal({
  title,
  onClose,
  children,
}: {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
}) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-title/30 p-4"
      onMouseDown={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="w-full max-w-md rounded-card border border-navy/10 bg-white p-5 shadow-pill"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <h2 className="font-display text-[17px] font-bold text-title">{title}</h2>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
}
