import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";
import { newGraph } from "../graphsManagerSlice";

const newGraphMiddleware = createListenerMiddleware();

newGraphMiddleware.startListening({
  actionCreator: newGraph,
  effect: (action: AnyAction, listenerApi) => {
    const { graphId } = action.payload;
    console.log(`Graph ${graphId} created`);
    listenerApi.dispatch({ type: "test" });
  },
});

export default newGraphMiddleware;
