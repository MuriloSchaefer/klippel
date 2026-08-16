import { createSlice } from "@reduxjs/toolkit";

import {
  materialAdded,
  materialDeleted,
  materialsCatalogDeltaLoaded,
  materialsCatalogLoaded,
  materialsPinned,
  materialsWindowLoaded,
  materialsWindowRequested,
} from "../materials/actions";
import { initialState, MaterialsWindowState } from "./state";

/**
 * De-duplicating append that preserves server rank order.
 *
 * A page can legitimately repeat an id the view already carries — a row the
 * user just edited moves in the ranking between two page requests — and the
 * grid must not render it twice.
 */
function appendIds(current: string[], incoming: string[]): string[] {
  if (!incoming.length) return current;
  const seen = new Set(current);
  const out = current.slice();
  for (const id of incoming) {
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(id);
  }
  // Same reference when nothing was added, so callers can use identity to
  // decide whether the slice actually moved.
  return out.length === current.length ? current : out;
}

const slice = createSlice({
  name: "materialsWindowSlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(materialsWindowRequested, (state) => ({
      ...state,
      loading: true,
    }));

    builder.addCase(materialsPinned, (state, { payload }) => {
      const next = appendIds(state.pinnedIds, payload.ids);
      return next === state.pinnedIds ? state : { ...state, pinnedIds: next };
    });

    builder.addCase(materialsWindowLoaded, (state, { payload }) => {
      // A by-id or type-scoped resolve says nothing about the browse/search
      // view — it loads rows something else needs (a graph node, a picker's
      // options), which are not part of any page. Recording its offsets would
      // make the next scroll skip a page.
      if (payload.mode === "ids" || payload.mode === "type") {
        return {
          ...state,
          loading: false,
          total: payload.total,
          initialized: true,
          pinnedIds: appendIds(state.pinnedIds, payload.pinned),
        };
      }

      // `reset` (cold open, workspace switch) and a query change both start a
      // new view; a scroll extends the current one. Extending is keyed on the
      // offset, not on the query alone, so a re-issued page-0 request — which
      // is what a live search does when a delta tick lands — replaces the
      // results rather than appending them to themselves.
      const startsNewView =
        payload.reset || payload.offset === 0 || payload.query !== state.query;

      return {
        ...state,
        loading: false,
        initialized: true,
        total: payload.total,
        matched: payload.matched,
        limit: payload.limit,
        query: payload.query,
        resultIds: startsNewView
          ? payload.page
          : appendIds(state.resultIds, payload.page),
        nextOffset: payload.offset + payload.page.length,
        hasMore: payload.hasMore,
        pinnedIds: payload.reset
          ? payload.pinned
          : appendIds(state.pinnedIds, payload.pinned),
      };
    });

    // A tick carries the catalog size for windowed clients (the renderer
    // cannot derive it from a page). `matched` deliberately does not move
    // here: recomputing it would mean scoring every material on every tick.
    // The viewport re-issues its search instead — see the middleware.
    builder.addCase(materialsCatalogDeltaLoaded, (state, { payload }) => {
      if (payload.full) {
        const total = Object.keys(payload.full.materials).length;
        return { ...state, total, matched: total };
      }
      const totalChanged =
        payload.total !== undefined && payload.total !== state.total;
      const removed = payload.removedMaterials ?? [];
      if (!totalChanged && !removed.length) return state;

      const next = { ...state };
      if (totalChanged) {
        next.total = payload.total as number;
        // In the browse view every material matches, so the catalog size *is*
        // the match count and stays exact for free. Under a query it cannot
        // be — deciding whether a row main did not send us matches would mean
        // scoring the whole catalog per tick — so the middleware re-runs the
        // search instead, and `matched` moves when that answer lands.
        if (!state.query) next.matched = next.total;
      }
      if (removed.length) {
        const gone = new Set(removed);
        next.resultIds = state.resultIds.filter((id) => !gone.has(id));
        next.pinnedIds = state.pinnedIds.filter((id) => !gone.has(id));
      }
      // Recomputed last, from the settled counts: rows arriving or leaving
      // both change whether there is anything left to page in.
      next.hasMore = next.resultIds.length < next.matched;
      return next;
    });

    // The whole-catalog load path (perf harness, explicit refresh) makes the
    // mirror complete by definition, so the view is everything and there is
    // nothing more to page in.
    builder.addCase(materialsCatalogLoaded, (_state, { payload }) => {
      const ids = Object.keys(payload.materials);
      return {
        ...initialState,
        initialized: true,
        total: ids.length,
        matched: ids.length,
        resultIds: ids,
        nextOffset: ids.length,
        hasMore: false,
      };
    });

    // Locally-authored rows join the view immediately — the optimistic
    // reducer already put them in `materials`, and a row the user just
    // created not appearing in the grid reads as a failed save.
    // A search view is the server's answer to a query, and a new row may
    // simply not match it — only the browse view takes the row directly. Both
    // counts self-correct on the next tick, which carries the real `total`.
    builder.addCase(materialAdded, (state, { payload }) => {
      if (state.query) return { ...state, total: state.total + 1 };
      return {
        ...state,
        total: state.total + 1,
        matched: state.matched + 1,
        resultIds: appendIds([String(payload.id)], state.resultIds),
      };
    });

    builder.addCase(materialDeleted, (state, { payload }) => {
      if (!state.resultIds.includes(payload.id)) return state;
      return {
        ...state,
        total: Math.max(0, state.total - 1),
        matched: Math.max(0, state.matched - 1),
        resultIds: state.resultIds.filter((id) => id !== payload.id),
        pinnedIds: state.pinnedIds.filter((id) => id !== payload.id),
      };
    });
  },
});

export default slice;
