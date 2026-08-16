import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";

import { MODULE_NAME } from "../../constants";
import type { ResidencyConfig } from "./state";

/**
 * `Date.now()` is captured here, in the action, never in the reducer —
 * reducers stay pure, and the timestamp is the one the caller observed.
 */
const withTimestamp = (ids: string[]) => ({
  payload: { ids: ids.filter(Boolean), at: Date.now() },
});

export interface ResidencyIdsPayload {
  ids: string[];
  at: number;
}

// Commands ------------------------------------------------------------

/**
 * Claim residency for as long as the caller is mounted.
 *
 * Every retain must be matched by exactly one `releaseMaterials`, which is
 * why the hooks do both in a single effect rather than spreading them across
 * handlers.
 */
export const retainMaterials = createAction(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.COMMAND}] Retain materials`,
  withTimestamp,
);

export const releaseMaterials = createAction(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.COMMAND}] Release materials`,
  withTimestamp,
);

/** Record a read without claiming residency — the imperative / arrival path. */
export const touchMaterials = createAction(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.COMMAND}] Touch materials`,
  withTimestamp,
);

/**
 * Drop from the mirror everything nothing needs any more.
 *
 * What is droppable is computed from this slice plus the window's pins (see
 * `selectors.ts`); this is only the trigger. Runs on a timer, after a window
 * read, and when the stock viewport closes.
 */
export const sweepMaterialsResidency = createAction(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.COMMAND}] Sweep materials residency`,
);

/** Retune the TTL / sweep cadence at runtime. */
export const configureMaterialsResidency = createAction<Partial<ResidencyConfig>>(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.COMMAND}] Configure materials residency`,
);

/**
 * Forget the access history — the mirror was replaced (workspace switch,
 * `reset` read), so it describes rows that are no longer there.
 *
 * Ref counts deliberately survive: they are not history, they count
 * components mounted *right now*, and those did not unmount because the
 * workspace did.
 */
export const resetMaterialsResidency = createAction(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.COMMAND}] Reset materials residency`,
);

// Events --------------------------------------------------------------

/** The sweep found nothing to reclaim — recorded so a tick is observable. */
export const materialsResidencySwept = createAction<{ evicted: number }>(
  `[${MODULE_NAME}:Residency:${ACTION_TYPES.EVENT}] Materials residency swept`,
);
