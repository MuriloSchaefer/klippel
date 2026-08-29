/**
 * The sweep, and the timer behind it.
 *
 * Everything else in this module only ever *adds* to the mirror; this is the
 * other half — the mirror gives rows back when nothing needs them, so
 * browsing a large catalog costs a bounded amount of renderer memory instead
 * of converging on "the whole catalog, eventually".
 */
import { createListenerMiddleware } from "@reduxjs/toolkit";

import { workspaceSelected } from "@kernel/modules/Store/actions";

import {
  closeMaterialsView,
  materialsEvicted,
  materialsWindowLoaded,
} from "../materials/actions";
import {
  configureMaterialsResidency,
  materialsResidencySwept,
  resetMaterialsResidency,
  sweepMaterialsResidency,
  touchMaterials,
} from "./actions";
import { selectEvictableIds, selectResidencyConfig } from "./selectors";
import type { MaterialsModuleState } from "../state";

type RootState = { Materials: MaterialsModuleState };

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: sweepMaterialsResidency,
  effect: async ({ payload }, { dispatch, getState }) => {
    const evictable = selectEvictableIds(getState() as RootState, Date.now(), {
      force: payload?.force,
    });
    dispatch(materialsResidencySwept({ evicted: evictable.length }));
    if (!evictable.length) return;
    dispatch(materialsEvicted({ ids: evictable }));
  },
});

// Closing the stock view reclaims its rows immediately. An ordinary sweep
// would find them all inside the grace period — the release that just
// happened *is* their last access — so this is the one caller that forces it.
middlewares.startListening({
  actionCreator: closeMaterialsView,
  effect: async (_action, { dispatch }) => {
    dispatch(sweepMaterialsResidency({ force: true }));
  },
});

/**
 * The sweep timer. One per renderer, not one per subscription — it is a
 * property of the mirror, not of any component.
 *
 * Module-level rather than in the slice because a timer handle is not state:
 * nothing renders it, it cannot be serialized, and it must not survive a
 * hot reload of the reducer.
 */
let sweepTimer: ReturnType<typeof setInterval> | undefined;

const startSweeping = (dispatch: (action: unknown) => void, intervalMs: number) => {
  if (sweepTimer !== undefined) clearInterval(sweepTimer);
  sweepTimer = setInterval(() => dispatch(sweepMaterialsResidency()), intervalMs);
};

middlewares.startListening({
  actionCreator: configureMaterialsResidency,
  effect: async (_action, { dispatch, getState }) => {
    // `setInterval` cannot be retuned, and the reducer has already clamped
    // the new value — read it back rather than trusting the payload.
    if (sweepTimer === undefined) return;
    const { sweepIntervalMs } = selectResidencyConfig(getState() as RootState);
    startSweeping(dispatch as never, sweepIntervalMs);
  },
});

middlewares.startListening({
  actionCreator: workspaceSelected,
  effect: async (_action, { dispatch, getState }) => {
    dispatch(resetMaterialsResidency());
    const { sweepIntervalMs } = selectResidencyConfig(getState() as RootState);
    startSweeping(dispatch as never, sweepIntervalMs);
  },
});

middlewares.startListening({
  actionCreator: materialsWindowLoaded,
  effect: async ({ payload }, { dispatch }) => {
    if (payload.reset) dispatch(resetMaterialsResidency());
    // Arrival counts as an access. Without this a freshly loaded row is
    // "never read" for the instant between the reducer and its consumer's
    // retain, and the sweep below would reclaim the row the caller just
    // asked for.
    const arrived = Object.keys(payload.materials ?? {});
    if (arrived.length) dispatch(touchMaterials(arrived));
    // A page just grew the mirror. Sweeping here — rather than only on the
    // timer — keeps a long browse from accumulating every page it passed
    // through, without waiting a whole interval to notice.
    dispatch(sweepMaterialsResidency());
  },
});

export default middlewares;
