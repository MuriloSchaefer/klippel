import { ACTION_TYPES } from "@kernel/constants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { BudgetItemState, BudgetState } from "../state";

// commands
export const createBudget = createAction<BudgetState>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.COMMAND}] Create budget`
);
export const deleteBudget = createAction<{id: string}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.COMMAND}] Delete budget`
);
export const addItemToBudget = createAction<{budgetId: string, item: BudgetItemState}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.COMMAND}] Add item to budget`
);
export const removeItemFromBudget = createAction<{budgetId: string, itemId: string}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.COMMAND}] Remove item from budget`
);
export const setItemAmount = createAction<{budgetId: string, itemId: string, amount: number}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.COMMAND}] Set item amount`
);

// events
export const budgetCreated = createAction<{id: string}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.EVENT}] Budget created`
)
export const budgetDeleted = createAction<BudgetState>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.EVENT}] Budget deleted`
)
export const itemAddedToBudget = createAction<{budgetId: string, itemId: string}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.EVENT}] Item added to budget`
)
export const itemRemovedFromBudget = createAction<{budgetId: string, itemId: string}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.EVENT}] Item removed from budget`
)
export const itemAmountSet = createAction<{budgetId: string, itemId: string, amount: number}>(
    `[${MODULE_NAME}:Budgets:${ACTION_TYPES.EVENT}] Item amount set`
)
