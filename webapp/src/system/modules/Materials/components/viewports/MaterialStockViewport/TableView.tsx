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
const extraParts = (attributes: unknown): ExtraPart[] => {
  const attrs = (attributes ?? {}) as Record<string, unknown>;
  const principal = attrs.nome ?? attrs.categoria;
  const parts: ExtraPart[] = [];
  for (const [k, v] of Object.entries(attrs)) {
    if (v === principal) continue;
    if (k === "nome") continue;
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
  return parts;
};

interface Props {
  materials: MaterialState[];
  onDelete: (id: string) => void;
}

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
const TableView: React.FC<Props> = ({ materials, onDelete }) => {
  const materialTypes = useMaterialTypes();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const apiRef = useGridApiRef();

  // Source of truth for the current selection. A ref (not state) so updating
  // it never re-renders TableView; the selected row is re-rendered by MUI's
  // own selection state, and `getActions` reads this ref to toggle the hint.
  const selectedIdRef = useRef<string | null>(null);

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
        field: "extra",
        headerName: "Extra",
        flex: 1,
        sortable: false,
        valueGetter: (_value, row: any) => extraParts(row.attributes).map((p) => p.text).join(" · "),
        renderCell: (params) => {
          const parts = extraParts((params.row as any).attributes);
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
      return;
    }
    if (!cur || !materials.find((m) => String(m.id) === cur)) {
      applySelection(String(materials[0].id));
    }
  }, [materials, applySelection]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== "Escape") {
      return;
    }
    const cur = selectedIdRef.current;
    if (e.key === "Escape") {
      applySelection(null);
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
    applySelection(String(materials[nextIdx].id));
  };

  // Keep the ref in sync with selections originating inside the grid (row
  // clicks, native keyboard) without re-rendering TableView.
  const handleRowSelectionModelChange = useCallback(
    (model: GridRowSelectionModel) => {
      const next = (model.ids.values().next().value as string | undefined) ?? null;
      selectedIdRef.current = next;
    },
    [],
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
        onRowSelectionModelChange={handleRowSelectionModelChange}
      />
    </Box>
  );
};

export default TableView;
