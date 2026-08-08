import { createListenerMiddleware } from "@reduxjs/toolkit";
import { createGroup, deleteGroup, groupCreated, groupDeleted } from "./actions";

const middlewares = createListenerMiddleware();

// NOTE: these effects deliberately do NOT touch `.session/`. Session data is a
// point-in-time snapshot written only by an explicit whole-session save — see
// `store/middlewares.ts` and e2e-tests.md §12.
middlewares.startListening({
  actionCreator: createGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(groupCreated(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: deleteGroup,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;
    dispatch(groupDeleted(payload)); // dispatch event
  },
});

export default middlewares;
