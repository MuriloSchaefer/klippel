import React from "react";
import {
  Box,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import TableChartSharpIcon from "@mui/icons-material/TableChartSharp";
import GridViewSharpIcon from "@mui/icons-material/GridViewSharp";
import SearchSharpIcon from "@mui/icons-material/SearchSharp";
import useModule from "@kernel/hooks/useModule";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { MODULE_NAME } from "../../../constants";

interface Props {
  view: "table" | "quadtree";
  onViewChange: (view: "table" | "quadtree") => void;
  query: string;
  onQueryChange: (q: string) => void;
}

/**
 * Top bar for the MaterialStock viewport. Each interactive control
 * pairs a `ShortcutHint` with its registered binding (`1`/`2`/`/`)
 * per the repo's "no secret keys" rule (`CLAUDE.md`). Update and
 * Delete are per-row actions in the table's trailing actions column —
 * the toolbar carries no row-level affordances.
 */
const MaterialStockToolbar: React.FC<Props> = ({
  view,
  onViewChange,
  query,
  onQueryChange,
}) => {
  const keyboardShortcuts =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcuts.components;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 1,
        alignItems: "center",
        p: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <ShortcutHint shortcutId={`${MODULE_NAME}/MaterialStockViewport/focusSearch`}>
        <TextField
          id="material-stock-search"
          data-testid="material-stock-search"
          size="small"
          placeholder="Buscar materiais"
          value={query}
          onChange={(e) => onQueryChange(e.target.value)}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchSharpIcon fontSize="small" />
                </InputAdornment>
              ),
            },
          }}
          sx={{ flex: 1, maxWidth: 320 }}
        />
      </ShortcutHint>

      <Box sx={{ flex: 1 }} />

      <ToggleButtonGroup
        size="small"
        value={view}
        exclusive
        onChange={(_e, v) => {
          if (v) onViewChange(v as "table" | "quadtree");
        }}
      >
        <ShortcutHint shortcutId={`${MODULE_NAME}/MaterialStockViewport/viewAsTable`}>
          <ToggleButton
            value="table"
            id="material-stock-view-table"
            data-testid="material-stock-view-table"
            aria-label="Tabela"
          >
            <TableChartSharpIcon fontSize="small" />
          </ToggleButton>
        </ShortcutHint>
        <ShortcutHint shortcutId={`${MODULE_NAME}/MaterialStockViewport/viewAsQuadtree`}>
          <ToggleButton
            value="quadtree"
            id="material-stock-view-quadtree"
            data-testid="material-stock-view-quadtree"
            aria-label="Quadtree"
          >
            <GridViewSharpIcon fontSize="small" />
          </ToggleButton>
        </ShortcutHint>
      </ToggleButtonGroup>
    </Box>
  );
};

export default React.memo(MaterialStockToolbar);
