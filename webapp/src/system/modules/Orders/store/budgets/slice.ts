import { createSlice } from "@reduxjs/toolkit";
import { BudgetItemState, BudgetsManagerState, BudgetState } from "../state";
import {
  addItemToBudget,
  createBudget,
  deleteBudget,
  removeItemFromBudget,
} from "./actions";
import { PathLike } from "fs";

import {
  defineRehydration,
  workspaceStorage as storage,
} from "@kernel/modules/Store/workspaceScope";

export const BUDGETS_SESSION_PATH = ".session/Orders/budgets";

storage.ensureDir(BUDGETS_SESSION_PATH);

export function persistBudget(state: BudgetState) {
  storage.ensureDir(BUDGETS_SESSION_PATH);
  storage.writeBlob(
    `${BUDGETS_SESSION_PATH}/${state.id}.json`,
    new Blob([JSON.stringify(state)]),
    { encoding: "utf-8" },
  );
  return state;
}

/**
 * Delete the session files of budgets that are no longer in state.
 *
 * Called only from the whole-session save. Individual `deleteBudget` commands
 * must not touch `.session/` — the snapshot only moves when the user saves.
 */
export async function pruneBudgetFiles(liveIds: string[]) {
  const keep = new Set(liveIds.map((id) => `${id}.json`));
  try {
    const files = await storage.searchDir(BUDGETS_SESSION_PATH, ["*.json"], {
      withFileTypes: true,
    });
    files
      .filter((file) => !keep.has(file.name))
      .forEach((file) =>
        storage.deleteFile(`${BUDGETS_SESSION_PATH}/${file.name}`),
      );
  } catch {
    // Nothing persisted yet — nothing to prune.
  }
}

const restoreBudgetsSession = async (
  sessionPath: PathLike = BUDGETS_SESSION_PATH,
) => {
  const files = await storage.searchDir(sessionPath, ["*.json"], {
    withFileTypes: true,
  });
  const budgets = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(
      `${sessionPath}/${file.name}`,
      { encoding: "utf-8" },
    );
    const content = JSON.parse(fileContent) as BudgetState;
    // `items` post-dates budgets already on disk; normalise on the way in so
    // nothing downstream has to guard for it.
    //
    // A pre-`grades` snapshot may still carry the old hand-editable `amount`.
    // It is dropped, not honoured: the quantity now comes from the curve and
    // nothing else, so such a line reads as its grades (or 1 when it has none).
    const items = Object.entries(content.items ?? {}).reduce((acc, [id, item]) => {
      const { amount: _legacyAmount, ...rest } = item as BudgetItemState & {
        amount?: number;
      };
      return { ...acc, [id]: rest };
    }, {});
    return { ...(await acc), [content.id]: { ...content, items } };
  }, {});
  return budgets as BudgetsManagerState;
};

export const budgetsRehydrated = defineRehydration<BudgetsManagerState>(
  "OrdersBudgets/rehydrated",
  restoreBudgetsSession,
);

// Every case below is pure — persistence lives in `budgets/middlewares.ts`.
const slice = createSlice({
  name: "budgets",
  initialState: await restoreBudgetsSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      budgetsRehydrated,
      (_state, { payload }) => payload as BudgetsManagerState,
    );
    builder.addCase(createBudget, (state, { payload }) => ({
      ...state,
      [payload.id]: payload,
    }));
    builder.addCase(deleteBudget, (state, { payload }) =>
      Object.values(state).reduce(
        (acc, curr) =>
          curr.id === payload.id ? acc : { ...acc, [curr.id]: curr },
        {} as BudgetsManagerState,
      ),
    );
    builder.addCase(addItemToBudget, (state, { payload }) => {
      const budget = state[payload.budgetId];
      if (!budget) return state;
      return {
        ...state,
        [budget.id]: {
          ...budget,
          items: { ...budget.items, [payload.item.itemId]: payload.item },
        },
      };
    });
    builder.addCase(removeItemFromBudget, (state, { payload }) => {
      const budget = state[payload.budgetId];
      if (!budget) return state;
      return {
        ...state,
        [budget.id]: {
          ...budget,
          items: Object.values(budget.items).reduce(
            (acc, item) =>
              item.itemId === payload.itemId
                ? acc
                : { ...acc, [item.itemId]: item },
            {},
          ),
        },
      };
    });
  },
});

export default slice;
