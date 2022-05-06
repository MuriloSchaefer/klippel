import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { updateNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { Part } from "modules/Composer/interfaces/Part";
import { partPropertiesChanged } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: partPropertiesChanged,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    const { graphId, partId, oldProperties, newProperties } = action.payload;
    dispatch(
      updateNode({
        graphId,
        node: {
          id: partId,
          properties: { ...oldProperties, ...newProperties },
        } as Part,
      })
    );
  },
});

export default middleware;
