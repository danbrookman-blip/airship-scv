"use client";

import { useState } from "react";
import { copyToClipboard } from "@/lib/clipboard";

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

/**
 * "Copy share link" control whose URL is resolved lazily (async) on click —
 * used for Named Views, where the signed link is minted by the API at click
 * time. Mirrors the look of the per-segment ShareButton.
 */
export function CopyLinkButton({
  getUrl,
  idleLabel = "Share view",
}: {
  getUrl: () => Promise<string | null>;
  idleLabel?: string;
}) {
  const [state, setState] = useState<"idle" | "copied" | "error">("idle");

  async function onClick(e: React.MouseEvent) {
    e.stopPropagation();
    const url = await getUrl();
    const ok = url ? await copyToClipboard(url) : false;
    setState(ok ? "copied" : "error");
    window.setTimeout(() => setState("idle"), 1800);
  }

  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Copy share link for this view"
      title="Copy share link for this view"
      className={
        "inline-flex items-center gap-1 rounded-badge border px-2.5 py-1 text-[11px] font-bold transition " +
        (state === "copied"
          ? "border-positive/30 bg-positive/10 text-positive"
          : state === "error"
            ? "border-danger/30 bg-danger/10 text-danger"
            : "border-brandblue/30 bg-brandblue/5 text-brandblue hover:bg-brandblue/10")
      }
    >
      {state === "copied" ? <CheckIcon /> : <LinkIcon />}
      {state === "copied" ? "Link copied" : state === "error" ? "Couldn’t copy" : idleLabel}
    </button>
  );
}
