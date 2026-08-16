import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridColDef,
  GridRowParams,
  GridRowSelectionModel,
  useGridApiRef,
} from "@mui/x-data-grid";
import useMaterialTypes from "../../../hooks/useMaterialTypes";
import DeleteMaterialButton from "./DeleteMaterialButton";
import UpdateMaterialButton from "./UpdateMaterialButton";
import type { MaterialState } from "../../../store/materials/state";
import { resolveTypeSchema } from "../../../store/materialTypes/resolveTypeSchema";
import type { MaterialTypesState } from "../../../store/materialTypes/state";

// Module-level so its identity never changes — an unstable `getRowId`
// makes DataGrid rebuild its entire row-id map and re-render every row.
const getRowId = (row: Record<string, unknown>) =>
  String((row as unknown as MaterialState).id);

type ExtraPart = { text: string; swatch?: string };

/**
 * Flatten a material's `attributes` map into the small chips rendered in
 * the Extra column. Scalars are stringified; nested objects fall back to
 * `label` or `amount + unit`. Anything that looks like a color
 * (`{ hex: "#…" }`) emits a `swatch` so the cell can render a small
 * coloured square next to the label.
 */
const HEX_RE = /^#?[0-9a-fA-F]{3,8}$/;
const isHex = (v: unknown): v is string =>
  typeof v === "string" && HEX_RE.test(v);
/**
 * Name of the attribute a type nominates as its `extra` selector — the one
 * that distinguishes two rows of the same product (colour, size). It gets
 * its own column, so it must not be repeated in the Extra chips.
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

const extraParts = (
  attributes: unknown,
  excludeKey?: string,
): ExtraPart[] => {
  const attrs = (attributes ?? {}) as Record<string, unknown>;
  const principal = attrs.nome ?? attrs.categoria;
  const parts: ExtraPart[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === principal) continue;
    if (k === "nome") continue;
    if (excludeKey && k === excludeKey) continue;
    if (v == null) continue;
    if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
      parts.push({ text: String(v) });
      continue;
    }
    if (typeof v === "object") {
      const o = v as Record<string, unknown>;
      if (isHex(o.hex)) {
        const hex = String(o.hex).startsWith("#") ? String(o.hex) : `#${o.hex}`;
        const label =
          typeof o.label === "string" && o.label
            ? o.label
            : hex;
        parts.push({ text: label, swatch: hex });
        continue;
      }
      if (typeof o.label === "string") {
        parts.push({ text: o.label });
        continue;
      }
      if (typeof o.amount === "number" && typeof o.unit === "string") {
        parts.push({ text: `${o.amount} ${o.unit}` });
      }
    }
  }
  // Swatches first: a colour is the fastest thing to scan for, and when the
  // cell has to clip it must not be what falls off the edge.
  parts.sort((a, b) => Number(Boolean(b.swatch)) - Number(Boolean(a.swatch)));
  return parts;
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
  /** More rows exist beyond the resident page. */
  hasMore?: boolean;
  /** A page request is in flight. */
  loading?: boolean;
}

/**
 * How close to the bottom (in px) counts as "reached the end". One viewport
 * height of lead time, so the next page is usually resident by the time the
 * user gets there rather than after they stop at a blank edge.
 */
const SCROLL_END_THRESHOLD_PX = 400;

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
  hasMore = false,
  loading = false,
}) => {
  const materialTypes = useMaterialTypes();
  const rootRef = useRef<HTMLDivElement | null>(null);
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
      { field: "id", headerName: "ID", width: 90 },
      {
        field: "type",
        headerName: "Tipo",
        width: 110,
        valueGetter: (_value, row: any) =>
          materialTypes?.[row.type]?.label ?? row.type,
      },
      {
        field: "principal",
        headerName: "Principal",
        flex: 1,
        valueGetter: (_value, row: any) =>
          row.attributes?.nome ?? row.attributes?.categoria ?? "",
      },
      {
        field: "selectorExtra",
        headerName: "Cor",
        width: 150,
        sortable: true,
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
            <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5, minWidth: 0 }}>
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
              <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {label}
              </Box>
            </Box>
          );
        },
      },
      {
        field: "extra",
        headerName: "Extra",
        flex: 1,
        sortable: false,
        valueGetter: (_value, row: any) =>
          extraParts(row.attributes, selectorExtraKey(materialTypes, row))
            .map((p) => p.text)
            .join(" · "),
        renderCell: (params) => {
          const parts = extraParts(
            (params.row as any).attributes,
            selectorExtraKey(materialTypes, params.row as any),
          );
          if (parts.length === 0) return null;
          return (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.75, flexWrap: "wrap" }}>
              {parts.map((p, i) => (
                <React.Fragment key={`${p.text}-${i}`}>
                  {i > 0 && <Box component="span" sx={{ opacity: 0.5 }}>·</Box>}
                  <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.5 }}>
                    {p.swatch && (
                      <Box
                        component="span"
                        sx={{
                          width: 12,
                          height: 12,
                          borderRadius: 0.5,
                          border: "1px solid",
                          borderColor: "divider",
                          backgroundColor: p.swatch,
                          flex: "0 0 auto",
                        }}
                      />
                    )}
                    <span>{p.text}</span>
                  </Box>
                </React.Fragment>
              ))}
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
        field: "stockAmount",
        headerName: "Estoque",
        width: 110,
        type: "number",
        valueGetter: (_value, row: any) => row.stock?.amount ?? 0,
      },
      {
        field: "stockUnit",
        headerName: "Unidade",
        width: 110,
        valueGetter: (_value, row: any) => row.stock?.unit ?? "",
      },
      {
        // Read-only mirror of the type schema's `consumptionUnit` —
        // the target unit Composer converts usage into. Blank when the
        // schema declares none, in which case usage lands in the stock
        // unit above.
        field: "consumptionUnit",
        headerName: "Un. consumo",
        width: 120,
        valueGetter: (_value, row: any) =>
          resolveTypeSchema(materialTypes?.[row.type], row.schemaVersion)
            ?.consumptionUnit ?? "",
      },
      {
        field: "actions",
        type: "actions",
        headerName: "",
        width: 100,
        getActions: (params: GridRowParams) => {
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
    [materialTypes, onDelete],
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
  // Read `hasMore` / `loading` through a ref: making them dependencies would
  // resubscribe on every page (they both flip twice per request), and the
  // store guards the request anyway. The check here only exists to avoid the
  // dispatch traffic.
  const pagingRef = useRef({ hasMore, loading, onReachedEnd });
  pagingRef.current = { hasMore, loading, onReachedEnd };

  useEffect(() => {
    const api = apiRef.current;
    if (!api?.subscribeEvent) return;
    return api.subscribeEvent("scrollPositionChange", (params) => {
      const { hasMore: more, loading: busy, onReachedEnd: notify } =
        pagingRef.current;
      if (!more || busy || !notify) return;
      const scroller = api.rootElementRef?.current?.querySelector(
        ".MuiDataGrid-virtualScroller",
      );
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
        disableColumnMenu
        onRowClick={handleRowClick}
        onRowSelectionModelChange={handleRowSelectionModelChange}
      />
    </Box>
  );
};

export default TableView;
