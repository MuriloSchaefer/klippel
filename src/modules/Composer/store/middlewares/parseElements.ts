import { createListenerMiddleware } from "@reduxjs/toolkit";
import { AnyAction } from "redux";

const parseElementsMiddleware = createListenerMiddleware();

parseElementsMiddleware.startListening({
  type: "[Composer] Parse Elements",
  effect: (action: AnyAction, listenerApi) => {
    console.log(`Parts found in model`, action);
    listenerApi.dispatch({ type: "test" });
  },
});

export default parseElementsMiddleware;
