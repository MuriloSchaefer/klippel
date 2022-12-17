import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { updateNode } from "@kernel/modules/Graphs/store/graphsManagerSlice";
import { Material } from "modules/Composer/interfaces/Material";
import { materialPropertiesChanged } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: materialPropertiesChanged,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    const { graphId, materialId, oldProperties, newProperties } =
      action.payload;
    dispatch(
      updateNode({
        graphId,
        node: {
          id: materialId,
          properties: { ...oldProperties, ...newProperties },
        } as Material,
      })
    );
  },
});

export default middleware;
