import { createListenerMiddleware } from "@reduxjs/toolkit";
import { createGroup, groupCreated } from "./actions";

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: createGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(groupCreated(payload)); // dispatch event
  },
});



export default middlewares;
