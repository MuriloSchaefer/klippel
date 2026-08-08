import type { Store } from "@reduxjs/toolkit";

import { OrdersModuleState } from "./state";
import { persistBudget, pruneBudgetFiles } from "./budgets/slice";
import { saveSession, sessionSaved } from "./actions";

/**
 * Write the Orders slice to `.session/`, as a snapshot of this instant.
 *
 * The **only** path from Orders state to disk. Individual budget mutations
 * deliberately do not persist — a session file set represents a point in time
 * the user chose, not a running log of every edit (e2e-tests.md §12).
 *
 * Reconciles rather than merely writing: budgets deleted since the last save
 * have their files pruned, otherwise they would return on the next rehydrate.
 */
export const persistOrdersSession = async (state: OrdersModuleState) => {
  const budgets = Object.values(state?.budgets ?? {});
  budgets.forEach(persistBudget);
  await pruneBudgetFiles(budgets.map((budget) => budget.id));
};

/**
 * The module's whole-session writer, registered with
 * `storage.registerSessionSaveListener` — same shape as every other module
 * (`SVG/store/slice.ts`, `Store/slice.ts`, …): it dispatches `saveSession` and
 * the middleware does the writing.
 *
 * It additionally *awaits* the write, which the other modules do not, so
 * `storage.saveSession()` resolves once the snapshot is actually on disk
 * rather than once the action has been dispatched. A plain `dispatch` returns
 * before the listener effect has written anything, so a caller that reloads
 * immediately after saving would race the write.
 *
 * The wait observes `lastSavedAt`, which the `sessionSaved` reducer stamps —
 * ordinary Redux state, not a side channel.
 */
export const sessionSaver =
  (store: Store<{ Orders: OrdersModuleState }>) => async () => {
    const savedAtBefore = store.getState().Orders?.lastSavedAt;
    const settled = new Promise<void>((resolve) => {
      const unsubscribe = store.subscribe(() => {
        if (store.getState().Orders?.lastSavedAt !== savedAtBefore) {
          unsubscribe();
          resolve();
        }
      });
    });

    store.dispatch(saveSession());
    await settled;
  };

export { saveSession, sessionSaved };
