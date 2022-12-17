import { ACTION_TYPES } from "@kernel/contants";
import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "./constants";


// Events
export const storeInitialized = createAction(
    `[${MODULE_NAME}:${ACTION_TYPES.EVENT}:Init] Store initialized`
  );