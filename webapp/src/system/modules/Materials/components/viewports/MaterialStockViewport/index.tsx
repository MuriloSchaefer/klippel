import React, { useCallback, useEffect, useMemo, useRef } from "react";
import { Box, Button } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { Store } from "@kernel/modules/Store";
import { setExtrasViewport } from "@kernel/modules/Layout/store/viewports/actions";
import {
  closeDetails,
  openDetails,
} from "@kernel/modules/Layout/store/panels/actions";
import { selectDetailsPanel } from "@kernel/modules/Layout/store/panels/selectors";

import { MODULE_NAME } from "../../../constants";
import useCatalogWindow from "../../../hooks/useCatalogWindow";
import { isPlaceholder } from "../../../store/window/selectors";
import MaterialStockToolbar from "./MaterialStockToolbar";
import TableView from "./TableView";
import SummaryBar from "./SummaryBar";
import MaterialDetails from "./MaterialDetails";
import {
  deleteMaterial,
  ensureMaterialsLoaded,
  loadMoreMaterials,
  searchMaterialsCatalog,
} from "../../../store/materials/actions";
import useMaterialResidency from "../../../hooks/useMaterialResidency";

export interface MaterialStockExtra {
  view: "table" | "quadtree";
  query: string;
  /**
   * The row the details panel is showing, or `null` when it is closed.
   * Lives in the viewport's `extra` — the same place `ModelViewport` keeps
   * `selectedPart` — because a viewport tab is a fresh component instance
   * on every switch (repo `CLAUDE.md`), so component-local state would drop
   * the user's pick the moment they looked at another tab.
   */
  selectedId: string | null;
}

const DEFAULT_EXTRA: MaterialStockExtra = {
  view: "table",
  query: "",
  selectedId: null,
};

const MaterialStockViewport: React.FC = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");
  const storeModule = useModule<Store>("Store");
  const keyboardShortcuts =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutProvider } = keyboardShortcuts.components;
  const { DetailsPanel } = layoutModule.components;
  const { useActiveViewport } = layoutModule.hooks;
  const dispatch = storeModule.hooks.useAppDispatch();
  const residency = useMaterialResidency();

  const activeVP = useActiveViewport<MaterialStockExtra>();
  const extra: MaterialStockExtra = useMemo(
    () => ({ ...DEFAULT_EXTRA, ...(activeVP.extra ?? {}) }),
    [activeVP.extra],
  );
  const catalog = useCatalogWindow();
  const rows = catalog.materials;

  // Push the query to main whenever it changes. The debounce is upstream in
  // the toolbar, so `extra.query` only moves once the user pauses; each move
  // is one search pass over the catalog in the main process, not a re-filter
  // of what happens to be resident.
  //
  // Read through a ref, and skip when main already holds this query, so that
  // remounting the viewport (a tab switch — every viewport is a fresh
  // component instance, per repo `CLAUDE.md`) does not re-issue the search
  // that produced the page already on screen.
  const servedQueryRef = useRef(catalog.query);
  servedQueryRef.current = catalog.query;
  const initializedRef = useRef(catalog.initialized);
  initializedRef.current = catalog.initialized;

  useEffect(() => {
    if (initializedRef.current && servedQueryRef.current === extra.query) return;
    dispatch(searchMaterialsCatalog({ query: extra.query }));
  }, [dispatch, extra.query]);

  // Scroll paging. The grid tells us it reached the end; whether that means
  // anything is the middleware's call — it drops the request when a page is
  // already in flight or there is nothing left.
  const handleReachedEnd = useCallback(() => {
    dispatch(loadMoreMaterials());
  }, [dispatch]);

  // Paging status the grid *pulls* when it scrolls, instead of props it would
  // re-render for. `hasMore` and `loading` move twice per page request; at a
  // page every few hundred milliseconds of fast scrolling, pushing them into
  // the grid means re-rendering every visible cell while the user is
  // scrolling through them.
  const pagingRef = useRef({ hasMore: catalog.hasMore, loading: catalog.loading });
  pagingRef.current = { hasMore: catalog.hasMore, loading: catalog.loading };
  const getPaging = useCallback(() => pagingRef.current, []);

  // Rows the user scrolled to whose data the mirror no longer holds. One
  // resolve per batch; the middleware de-duplicates ids already in flight, so
  // a fast scroll through reclaimed territory does not fan out into an IPC
  // per frame.
  const handleVisibleHoles = useCallback(
    (ids: string[]) => {
      dispatch(ensureMaterialsLoaded({ ids }));
    },
    [dispatch],
  );

  /** Rows matching the current view that are not in it yet. */
  const remaining = Math.max(0, catalog.matched - rows.length);

  // Rows in the view whose data is actually here — the view minus its
  // placeholders. Kept as its own count because `data-material-loaded` has
  // always meant "rows the renderer holds", and placeholders are positions,
  // not rows.
  const residentRows = useMemo(
    () => rows.reduce((n, row) => (isPlaceholder(row) ? n : n + 1), 0),
    [rows],
  );

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

  // The row whose details are on screen. `null` means no details panel at
  // all, and the layout gives the whole viewport back to the list — the
  // panel is a response to a pick, never a permanently reserved strip.
  const selectedId = extra.selectedId ?? null;
  const selectedMaterial = useMemo(
    () => {
      if (!selectedId) return undefined;
      const row = rows.find((m) => String(m.id) === selectedId);
      // A placeholder carries no data to show; the grid asks for it as soon
      // as it is on screen, and this fills in when it lands.
      return row && !isPlaceholder(row) ? row : undefined;
    },
    [rows, selectedId],
  );

  const handleSelect = useCallback(
    (id: string | null) => {
      patchExtra({ selectedId: id });
      dispatch(id ? openDetails() : closeDetails());
    },
    [patchExtra, dispatch],
  );

  // Hand the grid its starting pick without giving it a prop that changes:
  // a fresh instance after a tab switch has to adopt the pick recorded in
  // `extra`, but a re-render per selection would rebuild the whole grid
  // (see `TableView`'s note on `apiRef`). Stable callback, read on mount.
  const readSelectedId = useCallback(() => extraRef.current.selectedId ?? null, []);

  const detailsPanel = storeModule.hooks.useAppSelector(selectDetailsPanel);

  // A pick restored from `extra` — a tab switched back to — arrives with the
  // panel closed, because panel open/closed is layout state and `extra` does
  // not carry it. Re-open it once, on mount, before the mirror below can
  // read that closed state as a dismissal.
  const adoptedRef = useRef(false);
  useEffect(() => {
    if (adoptedRef.current) return;
    adoptedRef.current = true;
    if (selectedId !== null) dispatch(openDetails());
  }, [selectedId, dispatch]);

  // The panel's own close button only flips the layout state, so mirror it
  // back into the pick — otherwise the viewport keeps a selection the user
  // has visibly dismissed and the next arrow key silently re-opens it.
  //
  // Only a close that follows an *observed* open counts. The `openDetails`
  // above has not reduced yet when this first runs, so acting on the closed
  // state we still see would discard the very pick we just adopted.
  const sawOpenRef = useRef(false);
  useEffect(() => {
    if (detailsPanel?.state === "opened") {
      sawOpenRef.current = true;
      return;
    }
    if (sawOpenRef.current && selectedId !== null) {
      sawOpenRef.current = false;
      patchExtra({ selectedId: null });
    }
  }, [detailsPanel?.state, selectedId, patchExtra]);

  // Leave the panel closed behind us: it is shared layout state, and a tab
  // switch unmounts our portal content, which would otherwise leave an
  // empty panel holding a row of the portrait grid.
  //
  // Then ask for a sweep. This viewport is the biggest consumer of the
  // mirror — a browse session pulls in page after page — and closing it (or
  // switching away from it) is the moment none of that is on screen any more.
  // React runs the children's cleanups first, so `TableView` has already
  // released the rows it was rendering by the time this dispatches, and the
  // sweep sees them unprotected.
  //
  // Rows read moments ago still have their TTL grace and survive this pass;
  // what goes immediately is everything the user scrolled past earlier. The
  // rest is reclaimed by the next timer tick if they do not come back.
  useEffect(
    () => () => {
      dispatch(closeDetails());
      residency.functions.sweep();
    },
    [dispatch, residency],
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
    return (
      <TableView
        materials={rows}
        onDelete={handleDelete}
        onSelect={handleSelect}
        readInitialSelection={readSelectedId}
        onReachedEnd={handleReachedEnd}
        getPaging={getPaging}
        onVisibleHoles={handleVisibleHoles}
      />
    );
    // Deliberately **not** keyed on `hasMore` / `loading`: every dependency
    // here is a re-render of the grid, and those two say nothing about what
    // the rows look like. The grid reads them through `getPaging` when it
    // needs them.
  }, [
    extra.view,
    rows,
    handleDelete,
    handleSelect,
    readSelectedId,
    handleReachedEnd,
    getPaging,
    handleVisibleHoles,
  ]);

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
        // Count mirrors for e2e/perf waits (e2e-tests.md §11.4). Three
        // numbers, because with a windowed mirror they genuinely differ:
        //
        //   count  — rows *matching the current view* across the whole
        //            catalog, as main counted them. Empty query ⇒ the catalog
        //            size; a search ⇒ how many rows match. This keeps its
        //            pre-windowing meaning, which is what the existing waits
        //            were written against.
        //   loaded — rows actually resident and rendered. Below `count`
        //            whenever there is more to page in; this is the mirror a
        //            pagination assertion wants.
        //   total  — catalog size regardless of query.
        data-material-count={catalog.matched}
        // Rows in the view — including placeholders, i.e. positions the list
        // shows whether or not their data is resident. This is what grows by
        // a page when the user pages in.
        data-material-view={rows.length}
        data-material-loaded={residentRows}
        data-material-total={catalog.total}
        data-material-has-more={catalog.hasMore ? "true" : "false"}
        data-material-loading={catalog.loading ? "true" : "false"}
      >
        {selectedMaterial && (
          <DetailsPanel title="Detalhes do material">
            <MaterialDetails material={selectedMaterial} />
          </DetailsPanel>
        )}
        <MaterialStockToolbar
          view={extra.view}
          onViewChange={handleViewChange}
          query={extra.query}
          onQueryChange={handleQueryChange}
        />
        {view}
        {/*
          Explicit paging affordance alongside the scroll trigger. Scrolling
          is the discoverable gesture but it is not the only one: a user on a
          keyboard, or a screen reader, needs a control they can reach, and a
          test needs a target it can click without simulating momentum.
        */}
        {catalog.hasMore && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 0.5 }}>
            <Button
              size="small"
              variant="text"
              data-testid="material-stock-load-more"
              disabled={catalog.loading}
              onClick={handleReachedEnd}
            >
              {/*
                Say what the click does, not only what is left. "Carregar mais
                (337 restantes)" reads as "this loads 337", and one page then
                looks like a failure — a click always fetches exactly one page,
                so the label names both numbers.
              */}
              {catalog.loading
                ? "Carregando…"
                : `Carregar mais ${Math.min(
                    catalog.limit,
                    remaining,
                  ).toLocaleString()} de ${remaining.toLocaleString()}`}
            </Button>
          </Box>
        )}
        <SummaryBar
          materials={rows}
          loaded={rows.length}
          matched={catalog.matched}
        />
      </Box>
    </ShortcutProvider>
  );
};

export default MaterialStockViewport;
