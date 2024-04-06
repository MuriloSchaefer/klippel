import { createSelector } from "reselect";
import { OrdersModuleState } from "../state";

export const selectOrdersModule = (state: { Orders: OrdersModuleState }) =>
  state.Orders;

export const selectBudget = (id: string) =>
  createSelector(
    selectOrdersModule,
    (state: OrdersModuleState | undefined) => state?.budgets[id]
  );

export const listBudgets = () =>
  createSelector(
    selectOrdersModule,
    (state: OrdersModuleState | undefined) => Object.values(state?.budgets ?? {})
  );

