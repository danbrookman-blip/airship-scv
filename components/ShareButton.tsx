"use client";

import { useState } from "react";

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M12 9a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 10.5l4 4 8-9" />
    </svg>
  );
}

async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    /* fall through to legacy path */
  }
  try {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/**
 * "Copy share link" control for a segment card. Copies the segment's share URL
 * (with capability token) to the clipboard and shows brief confirmation.
 * Stops pointer/click propagation so it doesn't trigger the card's drag sensor.
 */
export function ShareButton({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      onPointerDown={(e) => e.stopPropagation()}
      aria-label="Copy share link"
      title="Copy share link"
      className={
        "inline-flex items-center gap-1 rounded-badge border px-2 py-1 text-[11px] font-bold transition " +
        (copied
          ? "border-positive/30 bg-positive/10 text-positive"
          : "border-brandblue/30 bg-brandblue/5 text-brandblue hover:bg-brandblue/10")
      }
    >
      {copied ? <CheckIcon /> : <LinkIcon />}
      {copied ? "Copied" : "Share"}
    </button>
  );
}
