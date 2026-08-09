import { createListenerMiddleware } from "@reduxjs/toolkit";

import { removeFromGroup } from "@kernel/modules/Layout/store/viewports/actions";
import { deleteGroup } from "@kernel/modules/Layout/store/viewports/groups/actions";
import type { LayoutState } from "@kernel/modules/Layout/store/state";

import {
  addItemToBudget,
  budgetCreated,
  budgetDeleted,
  createBudget,
  deleteBudget,
  itemAddedToBudget,
  itemRemovedFromBudget,
  removeItemFromBudget,
} from "./actions";
import { OrdersModuleState } from "../state";

const middlewares = createListenerMiddleware();

// NOTE: none of these effects write to `.session/`. Session data is a
// point-in-time snapshot owned by the whole-session save (`store/middlewares.ts`
// → `saveSession`); a budget mutation changes Redux state only, and reaches
// disk when the user saves. See e2e-tests.md §12.

middlewares.startListening({
  actionCreator: createBudget,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(budgetCreated({ id: payload.id }));
  },
});

middlewares.startListening({
  actionCreator: addItemToBudget,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(
      itemAddedToBudget({
        budgetId: payload.budgetId,
        itemId: payload.item.itemId,
      })
    );
  },
});

middlewares.startListening({
  actionCreator: removeItemFromBudget,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(itemRemovedFromBudget(payload));
  },
});

middlewares.startListening({
  actionCreator: deleteBudget,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getOriginalState } = listenerApi;

    // Read the pre-delete state: by the time the effect runs the reducer has
    // already dropped the budget, so `getState()` no longer knows its group.
    const {
      Orders: { budgets },
      Layout: layout,
    } = getOriginalState() as {
      Orders: OrdersModuleState;
      Layout: LayoutState;
    };
    const info = budgets[payload.id];
    if (!info) return;

    // Unwind the backing tab group: detach every member viewport first, then
    // drop the group. Viewports themselves stay open — deleting a budget must
    // not close the user's models. The budget's session file is left alone; the
    // next whole-session save prunes it.
    Object.values(layout?.viewportManager?.viewports ?? {})
      .filter((vp) => vp.group === info.viewportGroup)
      .forEach((vp) => dispatch(removeFromGroup({ viewportName: vp.name })));
    dispatch(deleteGroup({ name: info.viewportGroup }));

    dispatch(budgetDeleted(info));
  },
});

export default middlewares;
