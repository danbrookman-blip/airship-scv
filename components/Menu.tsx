"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Minimal popover menu: a trigger button plus an absolutely-positioned panel
 * that closes on outside-click or Escape. The panel content is a render prop so
 * callers can build simple item lists or inline-expanding sub-lists (used for
 * the per-card "Add to view ▸" picker).
 */
export function Menu({
  label,
  trigger,
  align = "right",
  panelClassName = "",
  triggerClassName = "",
  children,
}: {
  /** Accessible label for the trigger button. */
  label: string;
  /** Trigger contents (e.g. a kebab icon). */
  trigger: React.ReactNode;
  align?: "left" | "right";
  panelClassName?: string;
  triggerClassName?: string;
  children: (close: () => void) => React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label={label}
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className={triggerClassName}
      >
        {trigger}
      </button>
      {open && (
        <div
          role="menu"
          className={
            "absolute z-50 mt-1.5 min-w-[210px] rounded-card border border-navy/10 bg-white p-1 shadow-pill " +
            (align === "right" ? "right-0" : "left-0") +
            " " +
            panelClassName
          }
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

/** A single clickable row inside a Menu panel. */
export function MenuItem({
  onClick,
  danger = false,
  disabled = false,
  icon,
  children,
}: {
  onClick?: () => void;
  danger?: boolean;
  disabled?: boolean;
  icon?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      role="menuitem"
      disabled={disabled}
      onClick={onClick}
      className={
        "flex w-full items-center gap-2.5 rounded-btn px-3 py-2 text-left text-[13px] transition " +
        (disabled
          ? "cursor-not-allowed text-navy/30"
          : danger
            ? "text-danger hover:bg-danger/10"
            : "text-ink hover:bg-canvas")
      }
    >
      {icon ? <span className="shrink-0 text-navy/50">{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
    </button>
  );
}

/** A non-interactive section label inside a Menu panel. */
export function MenuLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="px-3 pb-1 pt-2 text-[10px] font-bold uppercase tracking-wide text-navy/40">
      {children}
    </div>
  );
}

/** Thin divider between menu groups. */
export function MenuSep() {
  return <div className="my-1 border-t border-navy/10" />;
}

/** Kebab (vertical dots) icon used for all burger menus. */
export function KebabIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="currentColor" aria-hidden>
      <circle cx="8" cy="3" r="1.5" />
      <circle cx="8" cy="8" r="1.5" />
      <circle cx="8" cy="13" r="1.5" />
    </svg>
  );
}
