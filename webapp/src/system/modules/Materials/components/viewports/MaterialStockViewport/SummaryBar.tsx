import React, { useMemo } from "react";
import { Box, Typography } from "@mui/material";
import useMaterialTypes from "../../../hooks/useMaterialTypes";
import { isPlaceholder } from "../../../store/window/selectors";
import type { MaterialState } from "../../../store/materials/state";

interface Props {
  materials: MaterialState[];
  /** Rows resident in the renderer. */
  loaded?: number;
  /** Rows matching the current view across the whole catalog. */
  matched?: number;
}

/**
 * Per-type stock total. Monetary totals are deferred (no `price`
 * field in the current fixture) — Phase 4 wires them once a price
 * source lands. Unit is taken from the first material in each group;
 * mixed-unit groups fall back to a blank unit.
 *
 * The totals here are over the **resident** rows, not the catalog: the
 * renderer mirrors a page, so summing what it holds is the only sum it can
 * make. The `loaded / matched` counter says so explicitly rather than letting
 * a partial total read as a catalog-wide one.
 */
const SummaryBar: React.FC<Props> = ({ materials, loaded, matched }) => {
  const materialTypes = useMaterialTypes();

  const groups = useMemo(() => {
    const byType: Record<string, { amount: number; unit: string; mixed: boolean }> =
      {};
    for (const m of materials) {
      // Placeholders are positions in the list, not rows: they carry no type
      // and no stock, and counting them would invent an unnamed group whose
      // total is zero.
      if (isPlaceholder(m)) continue;
      const t = m.type;
      if (!byType[t]) byType[t] = { amount: 0, unit: m.stock?.unit ?? "", mixed: false };
      const g = byType[t];
      g.amount += m.stock?.amount ?? 0;
      if (g.unit && m.stock?.unit && g.unit !== m.stock.unit) g.mixed = true;
    }
    return byType;
  }, [materials]);

  const total = useMemo(
    () =>
      materials.reduce(
        (acc, m) => (isPlaceholder(m) ? acc : acc + (m.stock?.amount ?? 0)),
        0,
      ),
    [materials],
  );

  return (
    <Box
      data-testid="material-stock-summary"
      sx={{
        display: "flex",
        flexWrap: "wrap",
        gap: 2,
        px: 2,
        py: 1,
        borderTop: "1px solid",
        borderColor: "divider",
        alignItems: "center",
      }}
    >
      {Object.entries(groups).map(([type, g]) => (
        <Box key={type} sx={{ display: "flex", flexDirection: "column" }}>
          <Typography variant="caption" color="text.secondary">
            {materialTypes?.[type]?.label ?? type}
          </Typography>
          <Typography variant="body2">
            {g.amount.toLocaleString()} {g.mixed ? "" : g.unit}
          </Typography>
        </Box>
      ))}
      <Box sx={{ flex: 1 }} />
      {loaded !== undefined && matched !== undefined && (
        <Box sx={{ textAlign: "right" }} data-testid="material-stock-loaded">
          <Typography variant="caption" color="text.secondary">
            Carregados
          </Typography>
          <Typography variant="body2">
            {loaded.toLocaleString()} / {matched.toLocaleString()}
          </Typography>
        </Box>
      )}
      <Box sx={{ textAlign: "right" }}>
        <Typography variant="caption" color="text.secondary">
          Total
        </Typography>
        <Typography variant="body2">{total.toLocaleString()}</Typography>
      </Box>
    </Box>
  );
};

export default React.memo(SummaryBar);
