import { createListenerMiddleware } from "@reduxjs/toolkit";
import { createBudget, budgetCreated, deleteBudget, budgetDeleted } from "./actions";
import { OrdersModuleState } from "../state";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: createBudget,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;


    dispatch(
      budgetCreated({
        id: payload.id,
      })
    ); // dispatch event
  },
});

middlewares.startListening({
    actionCreator: deleteBudget,
    effect: async ({ payload }, listenerApi) => {
      const { dispatch, getState } = listenerApi;
        
      const {Orders: {budgets}} = getState() as {Orders: OrdersModuleState}
      const info = budgets[payload.id]

      dispatch(
        budgetDeleted(info)
      ); // dispatch event
    },
  });


  export default middlewares