import { createSlice } from "@reduxjs/toolkit";

import { materialDeleted, materialsEvicted } from "../materials/actions";
import {
  configureMaterialsResidency,
  releaseMaterials,
  resetMaterialsResidency,
  retainMaterials,
  touchMaterials,
} from "./actions";
import {
  initialState,
  MIN_RESIDENCY_MS,
  type ResidencyState,
} from "./state";

/**
 * Mark ids as read at `at`, returning the same state when nothing moved.
 *
 * Identity matters more here than in most reducers: these actions fire from
 * scroll and render paths, and a new state object per dispatch is a store
 * notification — and a selector pass in every subscriber — for a fact nobody
 * renders.
 */
function touched(state: ResidencyState, ids: string[], at: number): ResidencyState {
  if (!ids.length) return state;
  let changed = false;
  const lastAccess = { ...state.lastAccess };
  for (const id of ids) {
    if (lastAccess[id] === at) continue;
    lastAccess[id] = at;
    changed = true;
  }
  return changed ? { ...state, lastAccess } : state;
}

const slice = createSlice({
  name: "materialsResidencySlice",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(retainMaterials, (state, { payload: { ids, at } }) => {
      if (!ids.length) return state;
      const refCounts = { ...state.refCounts };
      const lastAccess = { ...state.lastAccess };
      for (const id of ids) {
        refCounts[id] = (refCounts[id] ?? 0) + 1;
        lastAccess[id] = at;
      }
      return { ...state, refCounts, lastAccess };
    });

    builder.addCase(releaseMaterials, (state, { payload: { ids, at } }) => {
      if (!ids.length) return state;
      const refCounts = { ...state.refCounts };
      const lastAccess = { ...state.lastAccess };
      for (const id of ids) {
        const next = (refCounts[id] ?? 0) - 1;
        if (next > 0) refCounts[id] = next;
        else delete refCounts[id];
        // The TTL starts when the last reader lets go, not at the last
        // render: leaving a tab buys the row a full grace period.
        lastAccess[id] = at;
      }
      return { ...state, refCounts, lastAccess };
    });

    builder.addCase(touchMaterials, (state, { payload: { ids, at } }) =>
      touched(state, ids, at),
    );

    // Evicted rows are gone from the mirror, so their bookkeeping goes too —
    // otherwise this slice becomes the thing that grows with the catalog.
    builder.addCase(materialsEvicted, (state, { payload }) =>
      forget(state, payload.ids),
    );
    builder.addCase(materialDeleted, (state, { payload }) =>
      forget(state, [payload.id]),
    );

    builder.addCase(resetMaterialsResidency, (state) =>
      Object.keys(state.lastAccess).length
        ? { ...state, lastAccess: {} }
        : state,
    );

    builder.addCase(configureMaterialsResidency, (state, { payload }) => {
      const config = {
        ttlMs: Math.max(MIN_RESIDENCY_MS, payload.ttlMs ?? state.config.ttlMs),
        sweepIntervalMs: Math.max(
          MIN_RESIDENCY_MS,
          payload.sweepIntervalMs ?? state.config.sweepIntervalMs,
        ),
      };
      if (
        config.ttlMs === state.config.ttlMs &&
        config.sweepIntervalMs === state.config.sweepIntervalMs
      ) {
        return state;
      }
      return { ...state, config };
    });
  },
});

function forget(state: ResidencyState, ids: string[]): ResidencyState {
  if (!ids.length) return state;
  let changed = false;
  const refCounts = { ...state.refCounts };
  const lastAccess = { ...state.lastAccess };
  for (const id of ids) {
    if (id in refCounts) {
      delete refCounts[id];
      changed = true;
    }
    if (id in lastAccess) {
      delete lastAccess[id];
      changed = true;
    }
  }
  return changed ? { ...state, refCounts, lastAccess } : state;
}

export default slice;
