import { createSlice } from "@reduxjs/toolkit";
import { BudgetsManagerState } from "../state";
import { createBudget, deleteBudget } from "./actions";

const slice = createSlice({
  name: "budgets",
  initialState: {} as BudgetsManagerState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createBudget, (state, { payload }) => ({
      ...state,
      [payload.id]: payload,
    }));
    builder.addCase(deleteBudget, (state, { payload }) => {
      return Object.values(state).reduce(
        (acc, curr) =>
          curr.id === payload.id ? acc : { ...acc, [curr.id]: curr },
        {}
      );
    });
  },
});

export default slice;
