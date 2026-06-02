"use client";

import { useEffect, useState } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  KeyboardSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  rectSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import type { SegmentSummary } from "@/lib/airship/types";
import { SegmentCard } from "./SegmentCard";

const STORAGE_KEY = "scv:segment-order";

function SortableCard({ s, shareUrl }: { s: SegmentSummary; shareUrl?: string }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: s.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : undefined,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={
        "touch-none cursor-grab outline-none active:cursor-grabbing focus-visible:ring-2 focus-visible:ring-brandblue/60 " +
        (isDragging ? "scale-[1.02] opacity-95 shadow-pill" : "")
      }
    >
      <SegmentCard s={s} shareUrl={shareUrl} />
    </div>
  );
}

/**
 * Client-side sortable grid. Cards drag to re-rank; the rest reflow around the
 * gap. Order persists to localStorage so a rearrangement survives reloads.
 *
 * SSR-safe: first render uses the server order (matches the prop), then a saved
 * order (if any) is applied after mount — so there's no hydration mismatch.
 */
export function SegmentGrid({
  segments,
  shareUrls,
}: {
  segments: SegmentSummary[];
  shareUrls: Record<string, string>;
}) {
  const defaultOrder = segments.map((s) => s.id);
  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [customised, setCustomised] = useState(false);

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (Array.isArray(saved)) {
        const valid = saved.filter((id) => defaultOrder.includes(id));
        const missing = defaultOrder.filter((id) => !valid.includes(id));
        if (valid.length) {
          setOrder([...valid, ...missing]);
          setCustomised(true);
        }
      }
    } catch {
      /* ignore malformed storage */
    }
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sensors = useSensors(
    // small distance so clicks/selection aren't treated as drags
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const byId = new Map(segments.map((s) => [s.id, s]));
  const ordered = order.map((id) => byId.get(id)).filter(Boolean) as SegmentSummary[];

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    setOrder((prev) => {
      const next = arrayMove(prev, prev.indexOf(active.id as string), prev.indexOf(over.id as string));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      } catch {
        /* ignore */
      }
      return next;
    });
    setCustomised(true);
  }

  function resetOrder() {
    setOrder(defaultOrder);
    setCustomised(false);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <div>
      <div className="mb-2 flex h-5 items-center justify-end">
        {customised && (
          <button
            onClick={resetOrder}
            className="text-[11px] font-semibold text-brandblue hover:underline"
          >
            Reset to spend-per-visit order
          </button>
        )}
      </div>
      {/* Stable id → deterministic dnd-kit aria ids (avoids SSR hydration mismatch) */}
      <DndContext id="scv-dnd" sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={order} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 2xl:grid-cols-3">
            {ordered.map((s) => (
              <SortableCard key={s.id} s={s} shareUrl={shareUrls[s.id]} />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
