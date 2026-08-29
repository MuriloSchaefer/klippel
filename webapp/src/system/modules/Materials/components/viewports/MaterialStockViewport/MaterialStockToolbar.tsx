import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Box,
  CircularProgress,
  IconButton,
  InputAdornment,
  TextField,
  ToggleButton,
  ToggleButtonGroup,
  Tooltip,
} from "@mui/material";
import UpgradeSharpIcon from "@mui/icons-material/UpgradeSharp";
import TableChartSharpIcon from "@mui/icons-material/TableChartSharp";
import GridViewSharpIcon from "@mui/icons-material/GridViewSharp";
import SearchSharpIcon from "@mui/icons-material/SearchSharp";
import useModule from "@kernel/hooks/useModule";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { debounce } from "@kernel/utils";
import { MODULE_NAME } from "../../../constants";

/**
 * How long typing must pause before the query propagates to the filter.
 * The input echoes keystrokes instantly from local state; only the
 * expensive part (Redux dispatch → re-filter → DataGrid re-render)
 * waits for this, so a fast typist triggers one filter pass, not one
 * per keystroke.
 */
const SEARCH_DEBOUNCE_MS = 250;

interface Props {
  view: "table" | "quadtree";
  onViewChange: (view: "table" | "quadtree") => void;
  query: string;
  onQueryChange: (q: string) => void;
  /** Ticked rows that are behind their type's latest schema version. */
  migratableCount?: number;
  /** Ticked rows in total — a selection of already-current rows is not an error. */
  selectedCount?: number;
  /** Move the ticked rows onto their type's latest version. */
  onMigrate?: () => void;
  migrating?: boolean;
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
  migratableCount = 0,
  selectedCount = 0,
  onMigrate,
  migrating = false,
}) => {
  const keyboardShortcuts =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcuts.components;

  // Local mirror of the query so the input stays responsive while the
  // upstream filter is debounced. `onQueryChange` is read through a ref
  // so the debounced fn stays stable across renders (a new identity
  // would reset the timer mid-type).
  const [localQuery, setLocalQuery] = useState(query);
  const onQueryChangeRef = useRef(onQueryChange);
  onQueryChangeRef.current = onQueryChange;

  // Sync when the query changes from outside (programmatic clear,
  // workspace switch). Echoes of our own debounced push are no-ops; the
  // effect doesn't run mid-type because `query` only changes once the
  // debounced push lands.
  useEffect(() => {
    setLocalQuery(query);
  }, [query]);

  const pushQuery = useMemo(
    () =>
      debounce((value: string) => onQueryChangeRef.current(value), SEARCH_DEBOUNCE_MS),
    [],
  );

  const handleQueryInput = useCallback(
    (value: string) => {
      setLocalQuery(value);
      pushQuery(value);
    },
    [pushQuery],
  );

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
          value={localQuery}
          onChange={(e) => handleQueryInput(e.target.value)}
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

      {/*
        Bulk version migration, beside the search because it acts on what the
        search produced. Hidden until something is ticked: it is a rare,
        deliberate action, and a permanently visible button that is almost
        always disabled reads as broken.
      */}
      {selectedCount > 0 && (
        <Tooltip
          title={
            migratableCount > 0
              ? `Migrar ${migratableCount} de ${selectedCount} para a versão mais recente`
              : "As linhas selecionadas já estão na versão mais recente"
          }
        >
          {/* A disabled button does not emit the events a Tooltip needs. */}
          <Box component="span" sx={{ display: "inline-flex" }}>
            <IconButton
              size="small"
              color="warning"
              data-testid="material-stock-migrate"
              aria-label="Migrar versão dos materiais selecionados"
              disabled={migrating || migratableCount === 0}
              onClick={onMigrate}
            >
              {migrating ? <CircularProgress size={16} /> : <UpgradeSharpIcon />}
            </IconButton>
          </Box>
        </Tooltip>
      )}

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
