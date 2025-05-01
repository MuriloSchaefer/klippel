import { createSlice } from "@reduxjs/toolkit";
import { BudgetsManagerState, BudgetState } from "../state";
import { createBudget, deleteBudget } from "./actions";

const storage = window.electron.storage;
storage.ensureDir(".session/Orders/budgets");
function persistBudget(state: BudgetState){
  storage.writeBlob(`.session/Orders/budgets/${state.id}.js`, new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}

const slice = createSlice({
  name: "budgets",
  initialState: {} as BudgetsManagerState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createBudget, (state, { payload }) => ({
      ...state,
      [payload.id]: persistBudget(payload),
    }));
    builder.addCase(deleteBudget, (state, { payload }) => {
      storage.deleteFile(`.session/Orders/budgets/${state.id}.js`)
      return Object.values(state).reduce(
        (acc, curr) =>
          curr.id === payload.id ? acc : { ...acc, [curr.id]: curr },
        {}
      );
    });
  },
});

export default slice;
