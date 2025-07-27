

import { createAction } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import type { Model, ModelVariation } from "../../typings";
import { ACTION_TYPES } from "@kernel/contants";


export const openModel = createAction<{model: Model, variationId: string}>(
  `[${MODULE_NAME}:${ACTION_TYPES.COMMAND}] Open model`
);
export const modelOpened = createAction<{model: ModelVariation}>(
  `[${MODULE_NAME}:${ACTION_TYPES.EVENT}] Model openened`
);

