import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { BudgetState } from "../state";

// commands
export const createBudget = createAction<BudgetState>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Create budget`
);
export const deleteBudget = createAction<{id: string}>(
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.COMMAND}] Delete budget`
);

// events
export const budgetCreated = createAction<{id: string}>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Budget created`
)
export const budgetDeleted = createAction<BudgetState>( 
    `[${MODULE_NAME}:Compositions:${ACTION_TYPES.EVENT}] Budget deleted`
)
