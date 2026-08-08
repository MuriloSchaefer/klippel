import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { initialState } from "./state";

import budgetSlice from "./budgets/slice";
import { sessionSaved } from "./actions";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: { ...initialState, budgets: budgetSlice.getInitialState() },
  reducers: {},
  extraReducers: (builder) => {
    // Records that the snapshot reached disk. Read by the session-save
    // listener so `storage.saveSession()` can resolve on completion.
    builder.addCase(sessionSaved, (state) => ({
      ...state,
      lastSavedAt: Date.now(),
    }));
    // Forward everything else: enumerating cases here (it used to list only
    // `createBudget`) silently drops every other budget action. Same shape as
    // Layout's viewports slice.
    builder.addDefaultCase((state, action) => ({
      ...state,
      budgets: budgetSlice.reducer(state.budgets, action),
    }));
  },
});

export default slice;
