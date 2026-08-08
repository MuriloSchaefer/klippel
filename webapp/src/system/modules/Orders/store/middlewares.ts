import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveSession, sessionSaved } from "./actions";
import { OrdersModuleState } from "./state";
import { persistOrdersSession } from "./session";

const middlewares = createListenerMiddleware();

// The module's single writer, reached by dispatching `saveSession` — from the
// session-save listener (`store/session.ts` `sessionSaver`) like every other
// module, or directly. Emits `sessionSaved` once the snapshot is on disk, which
// the slice stamps as `lastSavedAt` so the listener can await completion.
middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;

      const {Orders: state} = getState() as { Orders: OrdersModuleState }
      await persistOrdersSession(state)

      dispatch(sessionSaved()); // dispatch event
  }
})

export default middlewares
