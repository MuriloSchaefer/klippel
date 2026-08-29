import React, { createContext, useContext } from "react";
import { Checkbox } from "@mui/material";

/**
 * Bulk-selection state, delivered to the tick boxes through context instead
 * of through the column definitions.
 *
 * The distinction is the whole point of this file. `columns` is handed to
 * every cell through DataGrid's own context, so a `columns` array that is
 * rebuilt when the selection changes re-renders **every cell in the grid** —
 * measured at ~600 ms for a single tick with 22 rows on screen
 * (docs/analysis/materials-catalog-scale-analysis.md). Columns therefore
 * depend only on things that describe the *shape* of the table, and the two
 * components below read the selection themselves.
 *
 * A context change still re-renders every consumer — but the consumers are
 * the tick boxes alone, not the grid.
 */
export interface SelectionContextValue {
  selectedIds: ReadonlySet<string>;
  /** Ids on screen that can be ticked, i.e. the view minus its placeholders. */
  selectableIds: readonly string[];
  onToggleSelected?: (id: string) => void;
  onToggleAllSelected?: () => void;
}

const EMPTY_SELECTED: ReadonlySet<string> = new Set();

export const SelectionContext = createContext<SelectionContextValue>({
  selectedIds: EMPTY_SELECTED,
  selectableIds: [],
});

/** One row's tick box. Re-renders when the selection moves, not when the grid does. */
export const RowSelectCheckbox: React.FC<{ id: string }> = ({ id }) => {
  const { selectedIds, onToggleSelected } = useContext(SelectionContext);
  return (
    <Checkbox
      size="small"
      data-testid={`material-select-${id}`}
      checked={selectedIds.has(id)}
      onChange={() => onToggleSelected?.(id)}
      // The row click opens the details panel; ticking is its own gesture and
      // must not do both.
      onClick={(e) => e.stopPropagation()}
      slotProps={{ input: { "aria-label": `Selecionar ${id}` } }}
    />
  );
};

/** The header tick box — select or clear every selectable row on screen. */
export const HeaderSelectCheckbox: React.FC = () => {
  const { selectedIds, selectableIds, onToggleAllSelected } =
    useContext(SelectionContext);
  const someSelected = selectedIds.size > 0;
  const allSelected =
    selectableIds.length > 0 && selectableIds.every((id) => selectedIds.has(id));
  return (
    <Checkbox
      size="small"
      data-testid="material-select-all"
      checked={allSelected}
      indeterminate={someSelected && !allSelected}
      onChange={() => onToggleAllSelected?.()}
      slotProps={{ input: { "aria-label": "Selecionar todos" } }}
    />
  );
};
