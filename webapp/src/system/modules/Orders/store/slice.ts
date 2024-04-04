import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { initialState } from "./state";
import { createBudget } from "./budgets/actions";

import budgetSlice from "./budgets/slice";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createBudget, (state, action) => ({
      ...state,
      budgets: budgetSlice.reducer(state.budgets, action),
    }));
  },
});

export default slice;
