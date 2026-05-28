import React, { useEffect, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import {
  DataGrid,
  GridActionsCellItem,
  GridColDef,
  GridRowParams,
} from "@mui/x-data-grid";
import EditSharpIcon from "@mui/icons-material/EditSharp";
import useMaterialTypes from "../../../hooks/useMaterialTypes";
import DeleteMaterialButton from "./DeleteMaterialButton";
import type { MaterialState } from "../../../store/materials/state";

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
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  onUpdate: (id: string) => void;
  onDelete: (id: string) => void;
}

/**
 * Read-only MUI DataGrid. The first row is auto-selected on mount and
 * whenever the filtered set changes; arrow keys cycle the selection
 * with top↔bottom wrap. All edits route through the Update form via
 * the trailing actions column — there is no inline cell editing.
 */
const TableView: React.FC<Props> = ({
  materials,
  selectedId,
  onSelect,
  onUpdate,
  onDelete,
}) => {
  const materialTypes = useMaterialTypes();
  const rootRef = useRef<HTMLDivElement | null>(null);

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
        getActions: (params: GridRowParams) => [
          <GridActionsCellItem
            key="update"
            icon={<EditSharpIcon />}
            label="Atualizar"
            data-testid={`material-row-update-${params.id}`}
            onClick={() => onUpdate(String(params.id))}
            showInMenu={false}
          />,
          <DeleteMaterialButton
            key="delete"
            id={String(params.id)}
            onConfirm={onDelete}
          />,
        ],
      },
    ],
    [materialTypes, onUpdate, onDelete],
  );

  // Auto-select first row on mount + when the filtered set changes
  // and the previous selection is no longer present.
  useEffect(() => {
    if (materials.length === 0) {
      if (selectedId !== null) onSelect(null);
      return;
    }
    if (!selectedId || !materials.find((m) => String(m.id) === selectedId)) {
      onSelect(String(materials[0].id));
    }
  }, [materials, selectedId, onSelect]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== "ArrowDown" && e.key !== "ArrowUp" && e.key !== "Enter" && e.key !== "Escape") {
      return;
    }
    if (e.key === "Escape") {
      onSelect(null);
      return;
    }
    if (e.key === "Enter") {
      if (selectedId) {
        e.preventDefault();
        onUpdate(selectedId);
      }
      return;
    }
    if (materials.length === 0) return;
    const idx = materials.findIndex((m) => String(m.id) === selectedId);
    const dir = e.key === "ArrowDown" ? 1 : -1;
    const nextIdx = (idx + dir + materials.length) % materials.length;
    e.preventDefault();
    onSelect(String(materials[nextIdx].id));
  };

  return (
    <Box
      ref={rootRef}
      sx={{ flex: 1, minHeight: 0 }}
      data-testid="material-stock-table"
      onKeyDown={handleKeyDown}
      tabIndex={0}
    >
      <DataGrid
        rows={materials as unknown as Record<string, unknown>[]}
        columns={columns}
        getRowId={(row) => String((row as MaterialState).id)}
        density="compact"
        disableColumnMenu
        rowSelectionModel={selectedId ? { type: "include", ids: new Set([selectedId]) } as any : undefined}
        onRowSelectionModelChange={(model: any) => {
          // MUI v7+: model.ids is a Set
          const ids = model?.ids ? Array.from(model.ids) : (model as string[] | undefined);
          const next = (ids?.[0] as string | undefined) ?? null;
          if (next !== selectedId) onSelect(next);
        }}
        onRowClick={(params) => onSelect(String(params.id))}
      />
    </Box>
  );
};

export default TableView;
