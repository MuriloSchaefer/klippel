import { ACTION_TYPES } from "@kernel/contants";
import { MODULE_NAME } from "../../constants";
import { createAction } from "@reduxjs/toolkit";
import { ModelVariation, Model } from "../../typings";

export const saveSession = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Save session`
);
export const sessionSaved = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] session saved`
);

export const createModel = createAction<Pick<Model, "id" | "name">>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Create Model`
);
export const modelCreated = createAction<{ model: ModelVariation }>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Model created`
);

export const listModels = createAction(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] List models`
);
export const modelsListed = createAction<Model[]>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Models listed`
);
