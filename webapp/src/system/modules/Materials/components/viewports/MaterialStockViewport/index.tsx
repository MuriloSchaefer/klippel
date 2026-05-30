import React, { useCallback, useMemo, useRef } from "react";
import { Box } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { setExtrasViewport } from "@kernel/modules/Layout/store/viewports/actions";

import { MODULE_NAME } from "../../../constants";
import useFilteredMaterials from "../../../hooks/useFilteredMaterials";
import MaterialStockToolbar from "./MaterialStockToolbar";
import TableView from "./TableView";
import SummaryBar from "./SummaryBar";
import { deleteMaterial } from "../../../store/materials/actions";

export interface MaterialStockExtra {
  view: "table" | "quadtree";
  query: string;
}

const DEFAULT_EXTRA: MaterialStockExtra = {
  view: "table",
  query: "",
};

const MaterialStockViewport: React.FC = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const keyboardShortcuts =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutProvider } = keyboardShortcuts.components;
  const { useActiveViewport } = layoutModule.hooks;
  const dispatch = storeModule.hooks.useAppDispatch();

  const activeVP = useActiveViewport<MaterialStockExtra>();
  const extra: MaterialStockExtra = useMemo(
    () => ({ ...DEFAULT_EXTRA, ...(activeVP.extra ?? {}) }),
    [activeVP.extra],
  );
  const filtered = useFilteredMaterials(extra.query);

  // Read latest `extra` via a ref so `patchExtra` (and the view/query
  // handlers derived from it) stay referentially stable — an unstable
  // handler would defeat the memoized `MaterialStockToolbar`.
  const extraRef = useRef(extra);
  extraRef.current = extra;

  const patchExtra = useCallback(
    (patch: Partial<MaterialStockExtra>) => {
      dispatch(
        setExtrasViewport({
          name: activeVP.name,
          extras: { ...extraRef.current, ...patch },
        }),
      );
    },
    [dispatch, activeVP.name],
  );

  const handleViewChange = useCallback(
    (view: MaterialStockExtra["view"]) => patchExtra({ view }),
    [patchExtra],
  );

  const handleQueryChange = useCallback(
    (query: string) => patchExtra({ query }),
    [patchExtra],
  );

  const handleDelete = useCallback(
    (id: string) => {
      // Confirmation is now a renderer-level `PointerContainer` popup
      // owned by `DeleteMaterialButton`; this handler is only reached
      // after the user clicks the in-popup confirm action.
      dispatch(deleteMaterial({ id }));
    },
    [dispatch],
  );

  const view = useMemo(() => {
    if (extra.view === "quadtree") {
      // Phase 4 — placeholder until QuadtreeView lands.
      return (
        <Box
          sx={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            color: "text.secondary",
          }}
          data-testid="material-stock-quadtree-placeholder"
        >
          Quadtree em breve
        </Box>
      );
    }
    return <TableView materials={filtered} onDelete={handleDelete} />;
  }, [extra.view, filtered, handleDelete]);

  return (
    <ShortcutProvider contextId={`${MODULE_NAME}/MaterialStockViewport`}>
      <Box
        sx={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
        }}
        data-testid="material-stock-viewport"
      >
        <MaterialStockToolbar
          view={extra.view}
          onViewChange={handleViewChange}
          query={extra.query}
          onQueryChange={handleQueryChange}
        />
        {view}
        <SummaryBar materials={filtered} />
      </Box>
    </ShortcutProvider>
  );
};

export default MaterialStockViewport;
