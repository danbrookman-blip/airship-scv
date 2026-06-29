"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  DndContext,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  useDraggable,
  type DragEndEvent,
} from "@dnd-kit/core";
import type { SegmentSummary } from "@/lib/airship/types";
import type { ViewLayout } from "@/lib/named-views";

const TILE_W = 340; // fixed tile width on the canvas
const GAP = 24; // gap used for the default grid arrangement
const MIN_CANVAS = 760; // below this the canvas falls back to a stacked column
const DEFAULT_ROW_H = 760; // initial row pitch before tiles are measured

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function DraggableTile({
  id,
  x,
  y,
  children,
}: {
  id: string;
  x: number;
  y: number;
  children: React.ReactNode;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties = {
    position: "absolute",
    left: x,
    top: y,
    width: TILE_W,
    transform: transform ? `translate3d(${transform.x}px, ${transform.y}px, 0)` : undefined,
    zIndex: isDragging ? 50 : undefined,
  };
  return (
    <div
      ref={setNodeRef}
      data-tile
      style={style}
      {...listeners}
      {...attributes}
      className={
        "touch-none cursor-grab outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brandblue/60 " +
        (isDragging ? "scale-[1.01] opacity-95 shadow-pill" : "")
      }
    >
      {children}
    </div>
  );
}

/**
 * Free-placement canvas: each tile sits at an absolute (x, y) the user drags to.
 * Positions are owned by the parent (saved per named view). Tiles without a
 * saved position fall into a tidy default grid. On narrow screens the canvas
 * gives way to a stacked column so it stays usable.
 */
export function FreeformCanvas({
  segments,
  positions,
  onMove,
  renderTile,
}: {
  segments: SegmentSummary[];
  positions: ViewLayout;
  onMove: (id: string, x: number, y: number) => void;
  renderTile: (s: SegmentSummary) => React.ReactNode;
}) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);
  const [rowH, setRowH] = useState(DEFAULT_ROW_H);

  // Track the available width so the default grid (and fallback) can react.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    setWidth(el.clientWidth);
    const ro = new ResizeObserver((entries) => setWidth(entries[0].contentRect.width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const freeform = width >= MIN_CANVAS;
  const cols = Math.max(1, Math.floor((width + GAP) / (TILE_W + GAP)));

  const defaultPos = (i: number) => ({
    x: (i % cols) * (TILE_W + GAP),
    y: Math.floor(i / cols) * rowH,
  });
  const placed = segments.map((s, i) => ({ s, pos: positions[s.id] ?? defaultPos(i) }));
  const posById = new Map(placed.map((p) => [p.s.id, p.pos]));

  // Measure tallest tile so the default grid packs tightly (cards are ~uniform).
  useLayoutEffect(() => {
    if (!freeform) return;
    const tiles = wrapRef.current?.querySelectorAll<HTMLElement>("[data-tile]");
    if (!tiles || tiles.length === 0) return;
    let max = 0;
    tiles.forEach((t) => (max = Math.max(max, t.offsetHeight)));
    const pitch = max + GAP;
    if (max > 0 && Math.abs(pitch - rowH) > 8) setRowH(pitch);
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor)
  );

  function onDragEnd(e: DragEndEvent) {
    const { active, delta } = e;
    if (!delta || (delta.x === 0 && delta.y === 0)) return;
    const base = posById.get(active.id as string) ?? { x: 0, y: 0 };
    const maxX = Math.max(0, width - TILE_W);
    onMove(
      active.id as string,
      Math.round(clamp(base.x + delta.x, 0, maxX)),
      Math.round(Math.max(0, base.y + delta.y))
    );
  }

  // Canvas grows to fit the lowest tile.
  const canvasHeight = freeform
    ? Math.max(420, ...placed.map((p) => p.pos.y + rowH))
    : undefined;

  return (
    <div ref={wrapRef}>
      {freeform ? (
        <DndContext id="scv-canvas" sensors={sensors} onDragEnd={onDragEnd}>
          <div className="relative" style={{ height: canvasHeight }}>
            {placed.map(({ s, pos }) => (
              <DraggableTile key={s.id} id={s.id} x={pos.x} y={pos.y}>
                {renderTile(s)}
              </DraggableTile>
            ))}
          </div>
        </DndContext>
      ) : (
        <div className="space-y-5">
          {segments.map((s) => (
            <div key={s.id} data-tile>
              {renderTile(s)}
            </div>
          ))}
          {width > 0 && (
            <p className="pt-1 text-center text-[11px] text-navy/50">
              Drag tiles to arrange them freely on a wider screen.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
