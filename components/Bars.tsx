import type { AgeBand, GenderSplit } from "@/lib/airship/types";
import { percent } from "@/lib/format";

/** Horizontal stacked bar for the gender split. */
export function GenderBar({ split }: { split: GenderSplit }) {
  const total = split.female + split.male + split.other + split.unknown || 1;
  const seg = (n: number) => `${(n / total) * 100}%`;
  const parts: Array<{ key: keyof GenderSplit; label: string; color: string }> = [
    { key: "female", label: "Female", color: "#38abff" },
    { key: "male", label: "Male", color: "#354b64" },
    { key: "other", label: "Other", color: "#a31fd8" },
    { key: "unknown", label: "Unknown", color: "#d8dee4" },
  ];
  return (
    <div>
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {parts.map((p) =>
          split[p.key] > 0 ? (
            <div key={p.key} style={{ width: seg(split[p.key]), background: p.color }} />
          ) : null
        )}
      </div>
      <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px] text-slate-500">
        {parts
          .filter((p) => split[p.key] > 0)
          .map((p) => (
            <span key={p.key} className="inline-flex items-center gap-1">
              <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
              {p.label} {percent(split[p.key] / total)}
            </span>
          ))}
      </div>
    </div>
  );
}

/** Vertical mini histogram for age bands. */
export function AgeBands({ bands }: { bands: AgeBand[] }) {
  const max = Math.max(1, ...bands.map((b) => b.count));
  return (
    <div className="flex items-stretch gap-1.5" style={{ height: 64 }}>
      {bands.map((b) => (
        <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-1">
          {/* Fixed-height track so the bar's % height has something to resolve against. */}
          <div className="flex w-full flex-1 items-end">
            <div
              className="w-full rounded-sm bg-brandblue/70"
              style={{ height: `${(b.count / max) * 100}%`, minHeight: 3 }}
              title={`${b.label}: ${b.count}`}
            />
          </div>
          <span className="text-[9px] leading-none text-slate-400">{b.label.replace("–", "-")}</span>
        </div>
      ))}
    </div>
  );
}
