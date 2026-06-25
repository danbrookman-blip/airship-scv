"use client";

import { useEffect, useState } from "react";
import type { SegmentSummary } from "@/lib/airship/types";
import { SegmentCard } from "./SegmentCard";
import { FreeformCanvas } from "./FreeformCanvas";
import { Menu, MenuItem, MenuLabel, MenuSep, KebabIcon } from "./Menu";
import { Modal } from "./Modal";
import { CopyLinkButton } from "./CopyLinkButton";
import { copyToClipboard } from "@/lib/clipboard";
import { gbp, integer, dateTimeLondon } from "@/lib/format";
import {
  LS,
  ALL_VIEW_KEY,
  loadJSON,
  saveJSON,
  makeId,
  applyOrder,
  totalsFor,
  makeBlankSegment,
  type NamedView,
  type Layouts,
  type ViewLayout,
} from "@/lib/named-views";

/* -------------------------------------------------------------------------- */
/* Small presentational helpers                                               */
/* -------------------------------------------------------------------------- */

function HeaderStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="px-5 first:pl-0">
      <div className="text-[12px] text-navy">{label}</div>
      <div className="mt-1 font-display text-xl font-bold text-title">{value}</div>
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Per-card burger menu: Add to view / Remove from view / Archive             */
/* -------------------------------------------------------------------------- */

function CardMenu({
  segment,
  views,
  onAdd,
  onRemove,
  onArchive,
  onNewViewWith,
}: {
  segment: SegmentSummary;
  views: NamedView[];
  onAdd: (viewId: string, segId: string) => void;
  onRemove: (viewId: string, segId: string) => void;
  onArchive: (segId: string) => void;
  onNewViewWith: (segId: string) => void;
}) {
  const inViews = views.filter((v) => v.segmentIds.includes(segment.id));
  const notInViews = views.filter((v) => !v.segmentIds.includes(segment.id));

  return (
    <Menu
      label={`Actions for ${segment.name}`}
      trigger={<KebabIcon />}
      triggerClassName="flex h-7 w-7 items-center justify-center rounded-btn text-navy/40 hover:bg-canvas hover:text-navy"
    >
      {(close) => (
        <div>
          <MenuLabel>Add to view</MenuLabel>
          {notInViews.length > 0 ? (
            notInViews.map((v) => (
              <MenuItem key={v.id} onClick={() => onAdd(v.id, segment.id)}>
                {v.name}
              </MenuItem>
            ))
          ) : (
            <div className="px-3 py-1.5 text-[12px] text-navy/40">
              {views.length ? "Already in every view" : "No named views yet"}
            </div>
          )}
          <MenuItem
            icon={<PlusIcon />}
            onClick={() => {
              onNewViewWith(segment.id);
              close();
            }}
          >
            New view with this segment…
          </MenuItem>

          <MenuSep />
          <MenuLabel>Remove from view</MenuLabel>
          {inViews.length > 0 ? (
            inViews.map((v) => (
              <MenuItem key={v.id} onClick={() => onRemove(v.id, segment.id)}>
                {v.name}
              </MenuItem>
            ))
          ) : (
            <div className="px-3 py-1.5 text-[12px] text-navy/40">Not in any view</div>
          )}

          <MenuSep />
          <MenuItem
            danger
            icon={<ArchiveIcon />}
            onClick={() => {
              onArchive(segment.id);
              close();
            }}
          >
            Archive segment
          </MenuItem>
        </div>
      )}
    </Menu>
  );
}

/* -------------------------------------------------------------------------- */
/* Named-views bar                                                            */
/* -------------------------------------------------------------------------- */

function ViewPill({
  active,
  name,
  count,
  onSelect,
  menu,
}: {
  active: boolean;
  name: string;
  count: number;
  onSelect: () => void;
  menu?: React.ReactNode;
}) {
  return (
    <div
      className={
        "flex items-center rounded-btn text-[13px] transition " +
        (active
          ? "bg-white font-semibold text-brandblue shadow-pill"
          : "bg-surface text-navy hover:bg-white/70")
      }
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex items-center gap-2 py-1.5 pl-3 pr-2"
      >
        <span>{name}</span>
        <span
          className={
            "rounded-badge px-1.5 py-0.5 text-[10px] font-bold " +
            (active ? "bg-brandblue/10 text-brandblue" : "bg-navy/5 text-navy/60")
          }
        >
          {count}
        </span>
      </button>
      {menu ? <span className="pr-1">{menu}</span> : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Board                                                                      */
/* -------------------------------------------------------------------------- */

export function SegmentBoard({
  segments,
  shareUrls,
  live,
  source,
  generatedAt,
}: {
  segments: SegmentSummary[];
  shareUrls: Record<string, string>;
  live: boolean;
  source: "live" | "sample";
  generatedAt: string;
}) {
  const defaultOrder = segments.map((s) => s.id);

  const [order, setOrder] = useState<string[]>(defaultOrder);
  const [views, setViews] = useState<NamedView[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [archived, setArchived] = useState<string[]>([]);
  const [custom, setCustom] = useState<SegmentSummary[]>([]);
  const [layouts, setLayouts] = useState<Layouts>({});
  const [addOpen, setAddOpen] = useState(false);
  // Generic "enter a name" modal, used for creating/renaming views.
  const [nameDialog, setNameDialog] = useState<{
    title: string;
    cta: string;
    initial: string;
    placeholder: string;
    onSubmit: (name: string) => void;
  } | null>(null);

  // Load persisted state after mount (deterministic SSR → no hydration mismatch).
  useEffect(() => {
    const savedOrder = loadJSON<string[]>(LS.order, []);
    if (Array.isArray(savedOrder) && savedOrder.length) setOrder(savedOrder);
    setViews(loadJSON<NamedView[]>(LS.views, []));
    setActiveId(loadJSON<string | null>(LS.active, null));
    setArchived(loadJSON<string[]>(LS.archived, []));
    setCustom(loadJSON<SegmentSummary[]>(LS.custom, []));
    setLayouts(loadJSON<Layouts>(LS.layouts, {}));
    // run once
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ---- derived ---- */
  const allSegments = [...segments, ...custom];
  const byId = new Map(allSegments.map((s) => [s.id, s]));
  const allIds = allSegments.map((s) => s.id);
  const archivedSet = new Set(archived);

  // If the active view was deleted, `activeView` is null and we fall back to All.
  const activeView = views.find((v) => v.id === activeId) ?? null;

  // Each view keeps its own tile arrangement; "All segments" uses ALL_VIEW_KEY.
  const layoutKey = activeView ? activeView.id : ALL_VIEW_KEY;
  const currentLayout: ViewLayout = layouts[layoutKey] ?? {};
  const hasLayout = Object.keys(currentLayout).length > 0;

  const scopeIds = activeView ? activeView.segmentIds : allIds;
  const visibleIds = applyOrder(
    order,
    scopeIds.filter((id) => byId.has(id) && !archivedSet.has(id))
  );
  const visibleSegments = visibleIds.map((id) => byId.get(id)!) as SegmentSummary[];
  const totals = totalsFor(visibleSegments);

  const allActiveCount = allIds.filter((id) => !archivedSet.has(id)).length;
  const archivedSegments = archived
    .map((id) => byId.get(id))
    .filter(Boolean) as SegmentSummary[];

  function viewCount(v: NamedView) {
    return v.segmentIds.filter((id) => byId.has(id) && !archivedSet.has(id)).length;
  }

  /* ---- persistence wrappers ---- */
  function commitViews(next: NamedView[]) {
    setViews(next);
    saveJSON(LS.views, next);
  }
  function commitActive(next: string | null) {
    setActiveId(next);
    saveJSON(LS.active, next);
  }
  function commitArchived(next: string[]) {
    setArchived(next);
    saveJSON(LS.archived, next);
  }
  function commitCustom(next: SegmentSummary[]) {
    setCustom(next);
    saveJSON(LS.custom, next);
  }
  function commitOrder(next: string[]) {
    setOrder(next);
    saveJSON(LS.order, next);
  }
  function commitLayouts(next: Layouts) {
    setLayouts(next);
    saveJSON(LS.layouts, next);
  }

  /* ---- tile arrangement (per view) ---- */
  function moveTile(id: string, x: number, y: number) {
    commitLayouts({
      ...layouts,
      [layoutKey]: { ...currentLayout, [id]: { x, y } },
    });
  }
  function tidyLayout() {
    // Drop saved positions for this view → tiles re-flow to the default grid.
    const next = { ...layouts };
    delete next[layoutKey];
    commitLayouts(next);
  }

  /* ---- view actions ---- */
  // Creating a view captures the current arrangement so the new tag looks
  // exactly like what you were just looking at (rather than snapping to a grid).
  function createView(name: string, segmentIds: string[], seedLayout?: ViewLayout) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const id = makeId("view");
    const view: NamedView = { id, name: trimmed, segmentIds };
    commitViews([...views, view]);
    if (seedLayout && Object.keys(seedLayout).length > 0) {
      commitLayouts({ ...layouts, [id]: seedLayout });
    }
    commitActive(id);
  }
  /** Copy the positions of the given ids out of the active view's layout. */
  function snapshotLayout(ids: string[]): ViewLayout {
    const seed: ViewLayout = {};
    for (const id of ids) if (currentLayout[id]) seed[id] = currentLayout[id];
    return seed;
  }
  function createViewFromCurrent() {
    const ids = visibleIds;
    const seed = snapshotLayout(ids);
    setNameDialog({
      title: "Name this view",
      cta: "Create view",
      initial: "",
      placeholder: "e.g. Loyalty focus",
      onSubmit: (name) => createView(name, ids, seed),
    });
  }
  function renameView(v: NamedView) {
    setNameDialog({
      title: "Rename view",
      cta: "Rename",
      initial: v.name,
      placeholder: "View name",
      onSubmit: (name) => {
        const trimmed = name.trim();
        if (!trimmed) return;
        commitViews(views.map((x) => (x.id === v.id ? { ...x, name: trimmed } : x)));
      },
    });
  }
  function deleteView(v: NamedView) {
    commitViews(views.filter((x) => x.id !== v.id));
    if (activeId === v.id) commitActive(null);
  }
  function addToView(viewId: string, segId: string) {
    commitViews(
      views.map((v) =>
        v.id === viewId && !v.segmentIds.includes(segId)
          ? { ...v, segmentIds: [...v.segmentIds, segId] }
          : v
      )
    );
  }
  function removeFromView(viewId: string, segId: string) {
    commitViews(
      views.map((v) =>
        v.id === viewId ? { ...v, segmentIds: v.segmentIds.filter((id) => id !== segId) } : v
      )
    );
  }
  // Mint a signed share link for a view (segment ids resolved on the server).
  async function shareViewUrl(view: NamedView): Promise<string | null> {
    const ids = view.segmentIds.filter((id) => byId.has(id));
    try {
      const res = await fetch("/api/share-view", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: view.name, segmentIds: ids }),
      });
      if (!res.ok) return null;
      const data = (await res.json()) as { url?: string };
      return data.url ?? null;
    } catch {
      return null;
    }
  }

  function newViewWithSegment(segId: string) {
    setNameDialog({
      title: "New view with this segment",
      cta: "Create view",
      initial: "",
      placeholder: "e.g. Watch list",
      onSubmit: (name) => createView(name, [segId], snapshotLayout([segId])),
    });
  }

  /* ---- archive ---- */
  function archive(segId: string) {
    if (!archived.includes(segId)) commitArchived([...archived, segId]);
  }
  function restore(segId: string) {
    commitArchived(archived.filter((id) => id !== segId));
  }

  /* ---- add segment ---- */
  function addSegment(name: string, destViewId: string | null) {
    const id = makeId("seg");
    const seg = makeBlankSegment(id, name.trim() || "New segment");
    commitCustom([...custom, seg]);
    commitOrder([...order, id]);
    if (destViewId) {
      commitViews(
        views.map((v) =>
          v.id === destViewId ? { ...v, segmentIds: [...v.segmentIds, id] } : v
        )
      );
      commitActive(destViewId);
    } else {
      commitActive(null);
    }
    setAddOpen(false);
  }

  return (
    <>
      {/* Title bar — large title, status, actions, page burger */}
      <div className="flex items-center justify-between gap-4">
        <h1 className="font-display text-[26px] font-bold text-title">Single Customer View</h1>
        <div className="flex items-center gap-3">
          <span
            className={
              "rounded-badge px-2.5 py-1 text-[11px] font-bold " +
              (live ? "bg-positive/10 text-positive" : "bg-brand-soft text-brand")
            }
            title={
              live
                ? "Served from the live Airship API"
                : "Sample data — add AIRSHIP_API_TOKEN to .env.local to go live"
            }
          >
            {live ? "● Live data" : "● Sample data"}
          </span>
          <button className="rounded-btn border-[1.8px] border-brandblue px-4 py-2 text-[11.2px] font-bold uppercase tracking-wide text-brandblue transition hover:bg-brandblue/5">
            Export
          </button>

          {/* Page-level burger (the /segments menu) */}
          <Menu
            label="Segments menu"
            trigger={<KebabIcon />}
            triggerClassName="flex h-9 w-9 items-center justify-center rounded-btn border-[1.8px] border-navy/15 text-navy/60 transition hover:border-brandblue hover:text-brandblue"
          >
            {(close) => (
              <div>
                <MenuItem
                  icon={<PlusIcon />}
                  onClick={() => {
                    setAddOpen(true);
                    close();
                  }}
                >
                  Add segment
                </MenuItem>
                <MenuItem
                  icon={<ViewsIcon />}
                  onClick={() => {
                    createViewFromCurrent();
                    close();
                  }}
                >
                  New view from current view
                </MenuItem>

                <MenuSep />
                <MenuLabel>Archived ({archivedSegments.length})</MenuLabel>
                {archivedSegments.length > 0 ? (
                  archivedSegments.map((s) => (
                    <MenuItem
                      key={s.id}
                      icon={<RestoreIcon />}
                      onClick={() => restore(s.id)}
                    >
                      Restore “{s.name}”
                    </MenuItem>
                  ))
                ) : (
                  <div className="px-3 py-1.5 text-[12px] text-navy/40">Nothing archived</div>
                )}
              </div>
            )}
          </Menu>
        </div>
      </div>

      <p className="mt-1 max-w-2xl text-[13px] text-navy">
        Every segment in one place — the value each delivers back to the business, plus who they
        are. Headline number is{" "}
        <strong className="font-semibold text-ink">average spend per visit</strong> (Known Spend ÷
        Proof of Presence visits).
      </p>
      <div className="mt-4 border-b border-navy/15" />

      {/* Named-views bar — sits just below the top rule */}
      <div className="mt-4 flex flex-wrap items-center gap-2">
        <ViewPill
          active={!activeView}
          name="All segments"
          count={allActiveCount}
          onSelect={() => commitActive(null)}
        />
        {views.map((v) => (
          <ViewPill
            key={v.id}
            active={activeView?.id === v.id}
            name={v.name}
            count={viewCount(v)}
            onSelect={() => commitActive(v.id)}
            menu={
              <Menu
                label={`View options for ${v.name}`}
                trigger={<KebabIcon />}
                triggerClassName="flex h-6 w-6 items-center justify-center rounded-btn text-navy/50 hover:bg-navy/5"
              >
                {(close) => (
                  <div>
                    <MenuItem
                      icon={<RenameIcon />}
                      onClick={() => {
                        renameView(v);
                        close();
                      }}
                    >
                      Rename
                    </MenuItem>
                    <ShareMenuRow getUrl={() => shareViewUrl(v)} />
                    <MenuItem
                      danger
                      icon={<TrashIcon />}
                      onClick={() => {
                        deleteView(v);
                        close();
                      }}
                    >
                      Delete view
                    </MenuItem>
                  </div>
                )}
              </Menu>
            }
          />
        ))}
        <button
          type="button"
          onClick={createViewFromCurrent}
          className="flex items-center gap-1.5 rounded-btn border border-dashed border-navy/25 px-3 py-1.5 text-[13px] font-semibold text-navy/70 transition hover:border-brandblue hover:text-brandblue"
        >
          <PlusIcon />
          {views.length ? "New view" : "Name this view"}
        </button>
      </div>

      {/* Scope hint + share when a named view is active */}
      {activeView && (
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          <p className="text-[12px] text-navy/60">
            Showing <strong className="font-semibold text-navy">{activeView.name}</strong> —{" "}
            {visibleSegments.length} {visibleSegments.length === 1 ? "tile" : "tiles"}. Totals and
            tile arrangement are saved to this view.
          </p>
          <CopyLinkButton getUrl={() => shareViewUrl(activeView)} idleLabel="Share view" />
        </div>
      )}

      {/* Totals strip — recomputed for whatever is in view */}
      <div className="mt-5 flex flex-wrap items-center gap-x-6 gap-y-3 rounded-card bg-surface px-5 py-4">
        <div className="flex flex-wrap divide-x divide-navy/10">
          <HeaderStat label="Segments" value={integer(totals.segmentCount)} />
          <HeaderStat label="Total customers" value={integer(totals.totalContacts)} />
          <HeaderStat label="Known Spend" value={gbp(totals.totalKnownSpend)} />
          <HeaderStat label="PoP visits" value={integer(totals.totalVisits)} />
          <HeaderStat
            label="Blended £/visit"
            value={gbp(totals.blendedSpendPerVisit, { decimals: true })}
          />
        </div>

        {/* Overlap caveat: the customer total sums segments, so non-exclusive
            segments can count the same person more than once. */}
        {totals.segmentCount >= 2 && (
          <div className="ml-auto flex max-w-[20rem] items-start gap-2 rounded-card border border-warning/40 bg-warning/10 px-3 py-2">
            <span className="mt-0.5 shrink-0 text-[#b8860b]">
              <WarnIcon />
            </span>
            <p className="text-[11px] leading-snug text-navy">
              <strong className="font-semibold text-title">
                Total customers can count people twice.
              </strong>{" "}
              It adds up each segment. If your segments overlap because you didn’t exclude customers
              already in another segment, the unique customer count is lower than this.
            </p>
          </div>
        )}
      </div>

      {/* Canvas */}
      <div className="mt-6">
        <div className="mb-2 flex h-5 items-center justify-end">
          {hasLayout && (
            <button
              onClick={tidyLayout}
              className="text-[11px] font-semibold text-brandblue hover:underline"
            >
              Tidy up into a grid
            </button>
          )}
        </div>

        {visibleSegments.length === 0 ? (
          <div className="rounded-card border border-dashed border-navy/15 bg-surface px-6 py-12 text-center">
            <p className="text-[14px] font-semibold text-title">No tiles in this view</p>
            <p className="mt-1 text-[12px] text-navy">
              Add segments from a card’s menu, or pick another view above.
            </p>
          </div>
        ) : (
          <FreeformCanvas
            // Re-key per view so positions reset cleanly when switching views.
            key={layoutKey}
            segments={visibleSegments}
            positions={currentLayout}
            onMove={moveTile}
            renderTile={(s) => (
              <SegmentCard
                s={s}
                shareUrl={shareUrls[s.id]}
                menu={
                  <CardMenu
                    segment={s}
                    views={views}
                    onAdd={addToView}
                    onRemove={removeFromView}
                    onArchive={archive}
                    onNewViewWith={newViewWithSegment}
                  />
                }
              />
            )}
          />
        )}
      </div>

      <p className="mt-8 text-center text-[11px] text-navy/60">
        Generated {dateTimeLondon(generatedAt)}
        {source === "sample" ? " · sample data" : ""} · drag tiles to arrange · saved per view
      </p>

      {/* Add-segment dialog */}
      {addOpen && (
        <AddSegmentDialog
          views={views}
          onClose={() => setAddOpen(false)}
          onConfirm={addSegment}
        />
      )}

      {/* Name / rename view dialog */}
      {nameDialog && (
        <NameDialog
          title={nameDialog.title}
          cta={nameDialog.cta}
          initial={nameDialog.initial}
          placeholder={nameDialog.placeholder}
          onClose={() => setNameDialog(null)}
          onConfirm={(name) => {
            nameDialog.onSubmit(name);
            setNameDialog(null);
          }}
        />
      )}
    </>
  );
}

/* -------------------------------------------------------------------------- */
/* Name / rename dialog                                                       */
/* -------------------------------------------------------------------------- */

function NameDialog({
  title,
  cta,
  initial,
  placeholder,
  onClose,
  onConfirm,
}: {
  title: string;
  cta: string;
  initial: string;
  placeholder: string;
  onClose: () => void;
  onConfirm: (name: string) => void;
}) {
  const [name, setName] = useState(initial);
  const submit = () => {
    if (name.trim()) onConfirm(name);
  };
  return (
    <Modal title={title} onClose={onClose}>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit();
        }}
        placeholder={placeholder}
        className="w-full rounded-btn border border-navy/15 px-3 py-2 text-[14px] text-ink outline-none focus:border-brandblue"
      />
      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-btn px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-navy/70 hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={submit}
          className="rounded-btn bg-brandblue px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-brandblue-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          {cta}
        </button>
      </div>
    </Modal>
  );
}

/* -------------------------------------------------------------------------- */
/* Add-segment dialog                                                         */
/* -------------------------------------------------------------------------- */

function AddSegmentDialog({
  views,
  onClose,
  onConfirm,
}: {
  views: NamedView[];
  onClose: () => void;
  onConfirm: (name: string, destViewId: string | null) => void;
}) {
  const [name, setName] = useState("");
  const [dest, setDest] = useState<string>("__base__");

  return (
    <Modal title="Add segment" onClose={onClose}>
      <label className="block text-[12px] font-semibold text-navy">Segment name</label>
      <input
        autoFocus
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="e.g. Lapsed VIPs"
        className="mt-1 w-full rounded-btn border border-navy/15 px-3 py-2 text-[14px] text-ink outline-none focus:border-brandblue"
      />

      {views.length > 0 && (
        <div className="mt-4">
          <div className="text-[12px] font-semibold text-navy">Add to view</div>
          <p className="mt-0.5 text-[11px] text-navy/50">
            You have named views — choose where this segment should appear.
          </p>
          <div className="mt-2 space-y-1">
            <DestRow
              checked={dest === "__base__"}
              onSelect={() => setDest("__base__")}
              label="All segments only"
              hint="Don’t add to a named view"
            />
            {views.map((v) => (
              <DestRow
                key={v.id}
                checked={dest === v.id}
                onSelect={() => setDest(v.id)}
                label={v.name}
              />
            ))}
          </div>
        </div>
      )}

      <div className="mt-5 flex justify-end gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-btn px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-navy/70 hover:bg-canvas"
        >
          Cancel
        </button>
        <button
          type="button"
          disabled={!name.trim()}
          onClick={() => onConfirm(name, dest === "__base__" ? null : dest)}
          className="rounded-btn bg-brandblue px-4 py-2 text-[12px] font-bold uppercase tracking-wide text-white transition hover:bg-brandblue-dark disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add segment
        </button>
      </div>
    </Modal>
  );
}

function DestRow({
  checked,
  onSelect,
  label,
  hint,
}: {
  checked: boolean;
  onSelect: () => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      className={
        "flex w-full items-center gap-3 rounded-btn border px-3 py-2 text-left transition " +
        (checked ? "border-brandblue bg-brandblue/5" : "border-navy/12 hover:border-navy/25")
      }
    >
      <span
        className={
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border " +
          (checked ? "border-brandblue" : "border-navy/30")
        }
      >
        {checked ? <span className="h-2 w-2 rounded-full bg-brandblue" /> : null}
      </span>
      <span className="min-w-0">
        <span className="block text-[13px] font-semibold text-ink">{label}</span>
        {hint ? <span className="block text-[11px] text-navy/50">{hint}</span> : null}
      </span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Share-link menu row (copies a signed view link, with inline feedback)      */
/* -------------------------------------------------------------------------- */

function ShareMenuRow({ getUrl }: { getUrl: () => Promise<string | null> }) {
  const [label, setLabel] = useState("Copy share link");
  async function onClick() {
    const url = await getUrl();
    const ok = url ? await copyToClipboard(url) : false;
    setLabel(ok ? "Link copied!" : "Couldn’t copy");
    window.setTimeout(() => setLabel("Copy share link"), 1800);
  }
  return (
    <MenuItem icon={<LinkIcon />} onClick={onClick}>
      {label}
    </MenuItem>
  );
}

/* -------------------------------------------------------------------------- */
/* Icons                                                                      */
/* -------------------------------------------------------------------------- */

function LinkIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 11a3.5 3.5 0 0 0 5 0l2-2a3.5 3.5 0 0 0-5-5l-1 1" />
      <path d="M12 9a3.5 3.5 0 0 0-5 0l-2 2a3.5 3.5 0 0 0 5 5l1-1" />
    </svg>
  );
}

function WarnIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 1.7L15 14H1L8 1.7z" />
      <path d="M8 6.3v3.2" />
      <circle cx="8" cy="11.6" r="0.5" fill="currentColor" />
    </svg>
  );
}

function PlusIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="1.8">
      <path d="M7 2.5v9M2.5 7h9" strokeLinecap="round" />
    </svg>
  );
}
function ArchiveIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="3" width="12" height="3" rx="0.8" />
      <path d="M3 6v6.5A1 1 0 0 0 4 13.5h8a1 1 0 0 0 1-1V6M6.5 9h3" strokeLinecap="round" />
    </svg>
  );
}
function RestoreIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 8a5 5 0 1 1 1.5 3.6" strokeLinecap="round" />
      <path d="M3 5.5V8h2.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
function ViewsIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="2" y="2.5" width="5" height="5" rx="1" />
      <rect x="9" y="2.5" width="5" height="5" rx="1" />
      <rect x="2" y="9" width="5" height="5" rx="1" />
      <rect x="9" y="9" width="5" height="5" rx="1" />
    </svg>
  );
}
function RenameIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M11 2.5l2.5 2.5L6 12.5l-3 .5.5-3L11 2.5z" strokeLinejoin="round" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M3 4.5h10M6.5 4.5V3h3v1.5M5 4.5l.5 8a1 1 0 0 0 1 .9h3a1 1 0 0 0 1-.9l.5-8" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
