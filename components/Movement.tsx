import type { MovementPoint } from "@/lib/airship/types";
import { signedPercent } from "@/lib/format";

/** Treat very small moves as flat so noise doesn't read as a trend. */
const FLAT_THRESHOLD = 0.003; // 0.3%

function direction(changePct: number): "up" | "down" | "flat" {
  if (changePct > FLAT_THRESHOLD) return "up";
  if (changePct < -FLAT_THRESHOLD) return "down";
  return "flat";
}

function Arrow({ dir }: { dir: "up" | "down" | "flat" }) {
  if (dir === "flat") return <span aria-hidden>–</span>;
  return <span aria-hidden>{dir === "up" ? "▲" : "▼"}</span>;
}

/**
 * Segment movement strip: is this segment growing or shrinking across trailing
 * 7 / 14 / 30 / 60 / 90-day windows? Green = up, red = down, grey = flat.
 */
export function Movement({ points }: { points: MovementPoint[] }) {
  return (
    <div className="rounded-card border border-navy/[0.06] bg-white/60 px-3 py-2.5">
      <div className="mb-1.5 text-[12px] text-navy">Segment movement</div>
      <div className="flex items-stretch justify-between gap-1">
        {points.map((p) => {
          const dir = direction(p.changePct);
          const color =
            dir === "up" ? "text-positive" : dir === "down" ? "text-danger" : "text-navy/50";
          return (
            <div key={p.windowDays} className="flex flex-1 flex-col items-center">
              <span className="text-[10px] font-medium text-navy/50">{p.windowDays}d</span>
              <span className={"mt-0.5 inline-flex items-center gap-0.5 text-[11.5px] font-bold " + color}>
                <Arrow dir={dir} />
                {signedPercent(p.changePct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
