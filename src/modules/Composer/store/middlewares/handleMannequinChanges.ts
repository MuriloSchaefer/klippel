import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

import { updateNode } from "@kernel/modules/GraphsManager/store/graphsManagerSlice";
import { mannequinChangedEvent } from "../actions";

const middleware = createListenerMiddleware();

middleware.startListening({
  actionCreator: mannequinChangedEvent,
  effect: (action: AnyAction, listenerApi) => {
    const { dispatch } = listenerApi;
    const { graphId, newAttributes } = action.payload;
    dispatch(
      updateNode({
        graphId,
        node: { ...newAttributes, id: "mannequinProperties" },
      })
    );
  },
});

export default middleware;