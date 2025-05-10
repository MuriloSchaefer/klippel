import { createListenerMiddleware } from "@reduxjs/toolkit";
import { saveSession, sessionSaved } from "./actions";
import { OrdersModuleState } from "./state";
import { persistBudget } from "./budgets/slice";

const middlewares = createListenerMiddleware();

middlewares.startListening({
  actionCreator: saveSession,
  effect: async (payload, listenerApi) => {
      const { dispatch, getState } = listenerApi;
      
      const {Orders: state} = getState() as { Orders: OrdersModuleState }

      Object.values(state.budgets).forEach(persistBudget)

      dispatch(sessionSaved()); // dispatch event
  }
})

export default middlewares