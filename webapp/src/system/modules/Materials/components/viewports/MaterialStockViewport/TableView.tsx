import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Checkbox, Tooltip } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRowParams,
  GridRowSelectionModel,
  useGridApiRef,
} from "@mui/x-data-grid";
import useMaterialTypes from "../../../hooks/useMaterialTypes";
import useUnitLabel from "../../../hooks/useUnitLabel";
import DeleteMaterialButton from "./DeleteMaterialButton";
import UpdateMaterialButton from "./UpdateMaterialButton";
import type { MaterialState } from "../../../store/materials/state";
import { useVisibleMaterials } from "../../../hooks/useMaterialResidency";
import { isPlaceholder } from "../../../store/window/selectors";
import { isOutdated } from "../../../store/materials/selectors";
import { resolveTypeSchema } from "../../../store/materialTypes/resolveTypeSchema";
import type { MaterialTypesState } from "../../../store/materialTypes/state";

// Module-level so its identity never changes — an unstable `getRowId`
// makes DataGrid rebuild its entire row-id map and re-render every row.
const getRowId = (row: Record<string, unknown>) =>
  String((row as unknown as MaterialState).id);

/**
 * Does this value look like a colour? The Extra cell renders a swatch beside
 * the label when it does — the attribute is schema-declared, so the cell can
 * only tell by looking at the value.
 */
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;
const isHex = (v: unknown): v is string =>
  typeof v === "string" && HEX_RE.test(v);

/**
 * Name of the attribute a type nominates as its `extra` selector — the one
 * that distinguishes two rows of the same product (colour for malha and
 * tecido, but that is the *type's* choice, which is why the column is headed
 * "Extra" and not "Cor").
 *
 * Deliberately resolves the **pinned** schema first, which is the opposite
 * precedence to `resolveTypeSchema` (latest-wins). That helper answers a
 * question about type-level *settings* — how the type is measured — where
 * the newest preference should apply catalog-wide. This one answers which
 * **attribute key to read off a specific material**, and a material's
 * `attributes` conform to the version it pinned. If a successor schema
 * renames the selector, older rows still carry the old key, so reading
 * them through the latest schema would silently blank their colour.
 */
const selectorExtraKey = (
  materialTypes: MaterialTypesState | undefined,
  row: { type?: string; schemaVersion?: string },
): string => {
  const t = materialTypes?.[row.type ?? ""];
  const pinned = row.schemaVersion ? t?.schemas?.[row.schemaVersion] : undefined;
  const schema = pinned ?? resolveTypeSchema(t, row.schemaVersion);
  return schema?.selector?.extra || "cor";
};

interface Props {
  materials: MaterialState[];
  onDelete: (id: string) => void;
  /**
   * A row was picked *by the user* — a click, or arrow navigation once a
   * pick is live. Not fired by the auto-selection on mount: the details
   * panel only exists because the user asked for it, so an automatic
   * selection must not open it.
   */
  onSelect?: (id: string | null) => void;
  /**
   * The pick this grid should start from — the one the viewport recorded in
   * its `extra` before the tab was switched away. A callback rather than a
   * value so the current pick never reaches this component as a changing
   * prop: read once, on mount.
   */
  readInitialSelection?: () => string | null;
  /**
   * The user scrolled to the end of the resident rows. The grid does not know
   * (or care) whether more exist — it reports the event and the store decides.
   */
  onReachedEnd?: () => void;
  /**
   * Paging status, read at scroll time rather than passed as props.
   *
   * `hasMore` and `loading` each flip twice per page request, and a prop that
   * changes is a re-render of the grid — DataGrid bundles its props into the
   * context every cell reads, so a flip that changes nothing visible still
   * re-renders every header and cell. That is the stutter a user feels when
   * pages stream in during a fast scroll. Behind a stable callback, the same
   * facts reach the scroll handler without touching the render path.
   */
  getPaging?: () => { hasMore: boolean; loading: boolean };
  /**
   * The rows the user can actually see changed (scroll, resize), and some of
   * them are placeholders. Called with the ids that need fetching — the
   * viewport turns that into one resolve.
   */
  onVisibleHoles?: (ids: string[]) => void;
  /** Rows ticked for a bulk action. Empty is the common case. */
  selectedIds?: ReadonlySet<string>;
  /** A row's tick box was clicked. */
  onToggleSelected?: (id: string) => void;
  /** The header tick box was clicked — select or clear every row on screen. */
  onToggleAllSelected?: () => void;
}

/**
 * Rows either side of the rendered range that count as "on screen" for
 * residency. One page's worth of lead in both directions, so a fling has
 * something to land on and the sweep is not fighting the scrollbar.
 */
const VISIBLE_BUFFER_ROWS = 100;

/**
 * How close to the bottom (in px) counts as "reached the end". One viewport
 * height of lead time, so the next page is usually resident by the time the
 * user gets there rather than after they stop at a blank edge.
 */
const SCROLL_END_THRESHOLD_PX = 400;

/**
 * Principal and Extra wrap instead of being clipped to one line, up to this
 * many lines. Pure CSS (`-webkit-line-clamp`), so the browser does the
 * measuring — no per-row JS, and no dynamic row height, which would make MUI
 * observe every rendered row and re-measure it mid-scroll.
 */
const CLAMP_LINES = 3;

const CLAMPED_TEXT = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: CLAMP_LINES,
  overflow: "hidden",
  whiteSpace: "normal",
  wordBreak: "break-word",
  lineHeight: 1.35,
} as const;

/**
 * Rows size to their content: a one-line row stays one line tall, and only a
 * row whose Principal or Extra actually wraps grows — up to `CLAMP_LINES`,
 * which is what bounds the variation.
 *
 * Module-level so the reference never changes; a fresh function per render
 * would be a new prop on every render, and DataGrid hands its props to every
 * cell through context.
 *
 * The cost, accepted deliberately: MUI measures each rendered row with a
 * `ResizeObserver` instead of multiplying one constant. The clamp is what
 * keeps that bounded — no row can be taller than three lines, so a scroll
 * cannot hit a wall of arbitrarily tall rows.
 */
const autoRowHeight = () => "auto" as const;

const EMPTY_SELECTED: ReadonlySet<string> = new Set();

const EMPTY_SELECTION: GridRowSelectionModel = {
  type: "include",
  ids: new Set(),
};

/**
 * Read-only MUI DataGrid. The first row is auto-selected on mount and
 * whenever the filtered set changes; arrow keys cycle the selection
 * with top↔bottom wrap. All edits route through the Update form via
 * the trailing actions column — there is no inline cell editing.
 *
 * Selection is driven imperatively through `apiRef`, never through a
 * controlled `rowSelectionModel` prop. Passing selection as a prop would
 * re-render `TableView` → `DataGrid` on every keypress, and DataGrid bundles
 * all its props into the `GridRootPropsContext` it hands every cell — so a
 * single new props object re-renders the entire grid (headers + all cells),
 * not just the selected rows. Going through `apiRef` mutates internal grid
 * state instead, so MUI's granular selectors re-render only the two rows
 * whose selection actually changed and `TableView` never re-renders.
 */
const TableView: React.FC<Props> = ({
  materials,
  onDelete,
  onSelect,
  readInitialSelection,
  onReachedEnd,
  getPaging,
  onVisibleHoles,
  selectedIds = EMPTY_SELECTED,
  onToggleSelected,
  onToggleAllSelected,
}) => {
  const materialTypes = useMaterialTypes();
  const unitLabel = useUnitLabel();
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Handlers through refs so the column definitions do not depend on them —
  // rebuilding `columns` re-renders every cell in the grid.
  const onToggleSelectedRef = useRef(onToggleSelected);
  onToggleSelectedRef.current = onToggleSelected;
  const onToggleAllSelectedRef = useRef(onToggleAllSelected);
  onToggleAllSelectedRef.current = onToggleAllSelected;

  const selectableIds = useMemo(
    () => materials.filter((m) => !isPlaceholder(m)).map((m) => String(m.id)),
    [materials],
  );
  const someSelected = selectedIds.size > 0;
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  const apiRef = useGridApiRef();

  // Read `onSelect` through a ref so notifying the parent never depends on
  // the callback's identity — same reason the grid drives selection through
  // `apiRef`: nothing about a selection may re-render this component.
  const onSelectRef = useRef(onSelect);
  onSelectRef.current = onSelect;

  // The row the details panel is showing, or `null` when it is closed. A
  // ref, not state: it only gates what the parent gets told, and nothing
  // this component renders depends on it. Seeded from the viewport's
  // recorded pick so a tab switched back to resumes where it left off.
  const detailIdRef = useRef<string | null>(readInitialSelection?.() ?? null);

  const notifySelect = useCallback((id: string | null) => {
    if (detailIdRef.current === id) return;
    detailIdRef.current = id;
    onSelectRef.current?.(id);
  }, []);

  // Source of truth for the current selection. A ref (not state) so updating
  // it never re-renders TableView; the selected row is re-rendered by MUI's
  // own selection state, and `getActions` reads this ref to toggle the hint.
  // Starts on the restored pick, so the auto-selection below leaves it
  // alone instead of dropping the user back on the first row.
  const selectedIdRef = useRef<string | null>(detailIdRef.current);

  // Whether the grid's own selection state has been written at least once.
  const appliedRef = useRef(false);

  // Push a selection into the grid's internal state. Keeps the ref in sync
  // synchronously so keyboard handlers (Enter, arrow cycling) can read the
  // latest value immediately.
  const applySelection = useCallback(
    (id: string | null) => {
      selectedIdRef.current = id;
      apiRef.current?.setRowSelectionModel(
        id ? { type: "include", ids: new Set([id]) } : EMPTY_SELECTION,
      );
    },
    [apiRef],
  );

  const columns: GridColDef[] = useMemo(
    () => [
      // A placeholder row carries an id and nothing else — the rest of its
      // fields are filler that must never be displayed as data. Every column
      // below therefore renders empty for one; the row keeps its height, so
      // the list under the scrollbar does not move while the real data is
      // fetched.
      {
        // Ticking rows is a bulk-action concern, kept deliberately separate
        // from the grid's own selection: that one drives the details panel
        // and the keyboard shortcuts (`e` / `d` act on `.Mui-selected`), and
        // MUI's `checkboxSelection` shares that single model — turning it on
        // would make opening a row's details also tick it for migration.
        field: "__selected",
        headerName: "",
        width: 48,
        sortable: false,
        filterable: false,
        disableColumnMenu: true,
        renderHeader: () => (
          <Checkbox
            size="small"
            data-testid="material-select-all"
            checked={allSelected}
            indeterminate={someSelected && !allSelected}
            onChange={() => onToggleAllSelectedRef.current?.()}
            slotProps={{ input: { "aria-label": "Selecionar todos" } }}
          />
        ),
        renderCell: (params) => {
          const row = params.row as MaterialState;
          if (isPlaceholder(row)) return null;
          const id = String(row.id);
          return (
            <Checkbox
              size="small"
              data-testid={`material-select-${id}`}
              checked={selectedIds.has(id)}
              onChange={() => onToggleSelectedRef.current?.(id)}
              // The row click opens the details panel; ticking is its own
              // gesture and must not do both.
              onClick={(e) => e.stopPropagation()}
              slotProps={{ input: { "aria-label": `Selecionar ${id}` } }}
            />
          );
        },
      },
      {
        // Amount and unit in one cell: they are one fact about the row, and
        // splitting them left a column of bare numbers whose meaning lived
        // two columns away. Sorting still keys on the amount, so the column
        // orders numerically rather than as "10 m" < "9 m".
        field: "stock",
        headerName: "Estoque",
        width: 130,
        type: "number",
        valueGetter: (_value, row: any) => row.stock?.amount ?? 0,
        renderCell: (params) => {
          const row = params.row as MaterialState;
          if (isPlaceholder(row)) return null;
          const amount = row.stock?.amount ?? 0;
          return `${amount.toLocaleString()} ${unitLabel(row.stock?.unit)}`.trim();
        },
      },
      {
        field: "principal",
        headerName: "Principal",
        flex: 1,
        cellClassName: "wrapped-cell",
        valueGetter: (_value, row: any) =>
          row.attributes?.nome ?? row.attributes?.categoria ?? "",
        renderCell: (params) =>
          isPlaceholder(params.row as MaterialState) ? null : (
            <Box sx={CLAMPED_TEXT}>{params.value}</Box>
          ),
      },
      {
        // The type schema names which attribute distinguishes two rows of the
        // same product (`selector.extra` — `cor` for malha and tecido, but the
        // point is that it is per type). The column is therefore called what
        // it *is*, "Extra", and never a hard-coded attribute name: a header
        // reading "Cor" over a grid that can hold several types is only right
        // by coincidence.
        field: "selectorExtra",
        headerName: "Extra",
        width: 180,
        sortable: true,
        cellClassName: "wrapped-cell",
        valueGetter: (_value, row: any) => {
          const v = row.attributes?.[selectorExtraKey(materialTypes, row)];
          if (v && typeof v === "object") return (v as any).label ?? (v as any).hex ?? "";
          return v == null ? "" : String(v);
        },
        renderCell: (params) => {
          const row = params.row as any;
          const v = row.attributes?.[selectorExtraKey(materialTypes, row)];
          if (v == null) return null;
          const o = (typeof v === "object" ? v : {}) as Record<string, unknown>;
          const hex = isHex(o.hex)
            ? String(o.hex).startsWith("#")
              ? String(o.hex)
              : `#${o.hex}`
            : undefined;
          const label =
            typeof o.label === "string" && o.label
              ? o.label
              : hex ?? (typeof v === "object" ? "" : String(v));
          if (!label && !hex) return null;
          return (
            <Box
              sx={{
                display: "inline-flex",
                // Top-aligned, because the swatch must sit beside the *first*
                // line of a label that may now be three lines tall.
                alignItems: "flex-start",
                gap: 0.5,
                minWidth: 0,
              }}
            >
              {hex && (
                <Box
                  component="span"
                  sx={{
                    width: 12,
                    height: 12,
                    borderRadius: 0.5,
                    border: "1px solid",
                    borderColor: "divider",
                    backgroundColor: hex,
                    flex: "0 0 auto",
                  }}
                />
              )}
              <Box component="span" sx={CLAMPED_TEXT}>
                {label}
              </Box>
            </Box>
          );
        },
      },
      {
        field: "origin",
        headerName: "Indústria / Fornecedores",
        width: 220,
        valueGetter: (_value, row: any) => {
          const industry = row.industry ? String(row.industry) : "";
          const suppliers = (row.suppliers ?? []).filter(
            (s: string) => s && s !== industry,
          );
          if (industry && suppliers.length > 0) {
            return `${industry} (${suppliers.join(", ")})`;
          }
          if (industry) return industry;
          return suppliers.join(", ");
        },
      },
      {
        // The pinned schema version, and whether it is the type's latest.
        // Without this the bulk migration would be invisible: it re-points a
        // row's version and leaves its attributes alone, so nothing else in
        // the grid moves when it runs.
        field: "schemaVersion",
        headerName: "Versão",
        width: 110,
        valueGetter: (_value, row: any) =>
          isPlaceholder(row) ? "" : (row.schemaVersion ?? ""),
        renderCell: (params) => {
          const row = params.row as MaterialState;
          if (isPlaceholder(row) || !row.schemaVersion) return null;
          const outdated = isOutdated(row, materialTypes);
          const latest = materialTypes?.[row.type]?.latestSchema;
          if (!outdated) {
            return (
              <Box component="span" sx={{ color: "text.secondary" }}>
                {row.schemaVersion}
              </Box>
            );
          }
          return (
            <Tooltip title={`Versão mais recente: ${latest}`}>
              <Box
                component="span"
                data-testid={`material-version-outdated-${row.id}`}
                sx={{ color: "warning.main", fontWeight: 500 }}
              >
                {row.schemaVersion} →
              </Box>
            </Tooltip>
          );
        },
      },
      {
        field: "actions",
        type: "actions",
        headerName: "",
        width: 100,
        getActions: (params: GridRowParams) => {
          // No actions on a row whose data is not here: Update would open a
          // form over filler, Delete would act on a row nobody has seen.
          if (isPlaceholder(params.row as MaterialState)) return [];
          const isSelected = String(params.id) === selectedIdRef.current;
          return [
            <UpdateMaterialButton
              key="update"
              material={params.row as MaterialState}
              selected={isSelected}
            />,
            <DeleteMaterialButton
              key="delete"
              id={String(params.id)}
              onConfirm={onDelete}
              selected={isSelected}
            />,
          ];
        },
      },
    ],
    [materialTypes, unitLabel, onDelete, selectedIds, allSelected, someSelected],
  );

  // Auto-select first row on mount + when the filtered set changes and the
  // previous selection is no longer present. Runs after DataGrid mounts, so
  // `apiRef.current` is populated.
  useEffect(() => {
    const cur = selectedIdRef.current;
    if (materials.length === 0) {
      if (cur !== null) applySelection(null);
      notifySelect(null);
      return;
    }
    if (!cur || !materials.find((m) => String(m.id) === cur)) {
      // The user's pick left the filtered set — drop the details with it
      // rather than silently pointing them at whatever took its place.
      if (cur) notifySelect(null);
      applySelection(String(materials[0].id));
    } else if (!appliedRef.current) {
      // Restored pick, still in the set: push it into the grid's own
      // selection state, which a fresh instance starts empty.
      applySelection(cur);
    }
    appliedRef.current = true;
  }, [materials, applySelection, notifySelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== "Escape") {
      return;
    }
    const cur = selectedIdRef.current;
    if (e.key === "Escape") {
      applySelection(null);
      notifySelect(null);
      return;
    }
    if (e.key === "Enter") {
      if (cur) {
        e.preventDefault();
        document.getElementById(`material-row-update-${cur}`)?.click();
      }
      return;
    }
    if (materials.length === 0) return;
    const idx = materials.findIndex((m) => String(m.id) === cur);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const nextIdx = (idx + dir + materials.length) % materials.length;
    e.preventDefault();
    const nextId = String(materials[nextIdx].id);
    applySelection(nextId);
    // Arrow keys move an open details panel, but never open one — the panel
    // is opened by a click (or re-opened after Escape by another click).
    if (detailIdRef.current !== null) notifySelect(nextId);
  };

  // Scroll paging. The free DataGrid has no `onRowsScrollEnd`, so we read the
  // virtual scroller's position off the grid's own event — which fires for
  // keyboard-driven scrolling too, not only the wheel, so paging works
  // without a mouse.
  //
  // Paging status is *pulled* at scroll time (`getPaging`) rather than pushed
  // as props, so a page landing mid-scroll never re-renders the grid. The
  // callbacks themselves go through a ref so the subscription is set up once.
  const pagingRef = useRef({ getPaging, onReachedEnd });
  pagingRef.current = { getPaging, onReachedEnd };

  // What the user can actually see, and therefore what must stay resident.
  //
  // The view can be thousands of ids long; the mirror must not be. So the
  // grid — the only thing that knows which rows are rendered — claims
  // residency for that range (plus a page of lead either side) and lets go of
  // everything else. Rows outside it are free to be reclaimed, and come back
  // as placeholders that resolve when they are scrolled to.
  //
  // Kept in a ref and diffed, because this fires on every scroll frame and
  // neither the retain nor the fetch may re-render anything.
  const visibleRef = useRef<{ ids: string[]; first: number; last: number }>({
    ids: [],
    first: -1,
    last: -1,
  });
  const materialsRef = useRef(materials);
  materialsRef.current = materials;

  // Residency for what is on screen. The hook owns the retain/release pairing
  // and releases everything at unmount, so this component only reports.
  const reportVisible = useVisibleMaterials();

  const updateVisibleRange = useCallback(
    (first: number, last: number) => {
      const rows = materialsRef.current;
      const from = Math.max(0, first - VISIBLE_BUFFER_ROWS);
      const to = Math.min(rows.length - 1, last + VISIBLE_BUFFER_ROWS);
      const prev = visibleRef.current;
      if (prev.first === from && prev.last === to) return;

      const ids: string[] = [];
      const holes: string[] = [];
      for (let i = from; i <= to; i++) {
        const row = rows[i];
        if (!row) continue;
        ids.push(String(row.id));
        if (isPlaceholder(row)) holes.push(String(row.id));
      }

      // One coalesced dispatch per burst — this fires on every scroll frame,
      // and the hook diffs and batches so a fling is not a store notification
      // per frame (see `useVisibleMaterials`).
      reportVisible(ids);
      visibleRef.current = { ids, first: from, last: to };

      if (holes.length) onVisibleHolesRef.current?.(holes);
    },
    [reportVisible],
  );

  const onVisibleHolesRef = useRef(onVisibleHoles);
  onVisibleHolesRef.current = onVisibleHoles;

  useEffect(() => {
    const api = apiRef.current;
    if (!api?.subscribeEvent) return;
    return api.subscribeEvent("renderedRowsIntervalChange", (params) => {
      updateVisibleRange(params.firstRowIndex, params.lastRowIndex);
    });
  }, [apiRef, updateVisibleRange]);


  // A page landing (or a search answering) changes what sits in the rendered
  // range without moving the range itself, so re-evaluate against the new rows.
  useEffect(() => {
    const { first, last } = visibleRef.current;
    if (first < 0) return;
    visibleRef.current = { ...visibleRef.current, first: -1, last: -1 };
    updateVisibleRange(first + VISIBLE_BUFFER_ROWS, last - VISIBLE_BUFFER_ROWS);
  }, [materials, updateVisibleRange]);

  useEffect(() => {
    const api = apiRef.current;
    if (!api?.subscribeEvent) return;
    // The scroller element is looked up once and cached: `scrollPositionChange`
    // fires on every frame of a fling, and a `querySelector` per frame is work
    // done on the same thread that has to paint the rows.
    let scroller: Element | null = null;
    return api.subscribeEvent("scrollPositionChange", (params) => {
      const { getPaging: paging, onReachedEnd: notify } = pagingRef.current;
      if (!notify) return;
      const { hasMore, loading } = paging?.() ?? { hasMore: false, loading: false };
      if (!hasMore || loading) return;
      if (!scroller?.isConnected) {
        scroller =
          api.rootElementRef?.current?.querySelector(
            ".MuiDataGrid-virtualScroller",
          ) ?? null;
      }
      if (!scroller) return;
      const remaining =
        scroller.scrollHeight - (params.top + scroller.clientHeight);
      if (remaining <= SCROLL_END_THRESHOLD_PX) notify();
    });
  }, [apiRef]);

  // Keep the ref in sync with selections originating inside the grid (row
  // clicks, native keyboard) without re-rendering TableView.
  const handleRowSelectionModelChange = useCallback(
    (model: GridRowSelectionModel) => {
      const next = (model.ids.values().next().value as string | undefined) ?? null;
      selectedIdRef.current = next;
    },
    [],
  );

  // A click is the gesture that opens the details panel. Clicking the row
  // that is already open closes it again, so the list can be taken back to
  // full height without reaching for the panel's close button.
  const handleRowClick = useCallback(
    (params: GridRowParams) => {
      const id = String(params.id);
      applySelection(id);
      notifySelect(detailIdRef.current === id ? null : id);
    },
    [applySelection, notifySelect],
  );

  return (
    <Box
      ref={rootRef}
      sx={{ flex: 1, minHeight: 0 }}
      data-testid="material-stock-table"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <DataGrid
        apiRef={apiRef}
        rows={materials as unknown as Record<string, unknown>[]}
        columns={columns}
        getRowId={getRowId}
        density="compact"
        getRowHeight={autoRowHeight}
        sx={{
          // Auto-height rows have no fixed line box to centre against, so the
          // breathing room has to be explicit — otherwise a one-line row sits
          // flush against the row divider.
          "& .MuiDataGrid-cell": {
            paddingTop: 0.5,
            paddingBottom: 0.5,
          },
          // A wrapped cell is a block of text, not a centred single line.
          "& .MuiDataGrid-cell.wrapped-cell": {
            alignItems: "flex-start",
            whiteSpace: "normal",
          },
        }}
        disableColumnMenu
        onRowClick={handleRowClick}
        onRowSelectionModelChange={handleRowSelectionModelChange}
      />
    </Box>
  );
};

/**
 * Memoized because the viewport around it re-renders on every window-state
 * move — a request starting, a count arriving — and none of that changes what
 * this renders. With the paging props gone, the only prop that moves is
 * `materials`, i.e. the rows themselves.
 */
export default React.memo(TableView);
