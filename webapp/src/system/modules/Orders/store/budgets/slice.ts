import { createSlice } from "@reduxjs/toolkit";
import { BudgetsManagerState, BudgetState } from "../state";
import { createBudget, deleteBudget } from "./actions";
import { PathLike } from "fs";

const storage = globalThis.electron.storage;
storage.ensureDir(".session/Orders/budgets");
export function persistBudget(state: BudgetState){
  storage.writeBlob(`.session/Orders/budgets/${state.id}.json`, new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}
const restoreBudgetsSession = async (sessionPath: PathLike = ".session/Orders/budgets") => {
  const files = await storage.searchDir(sessionPath, ['*.json'], { withFileTypes: true, });
  const budgets = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(`${sessionPath}/${file.name}`, {encoding: 'utf-8'});
    const content = JSON.parse(fileContent) as BudgetState;
    return {...await acc, [content.id]: content};
  }, {})
  return budgets as BudgetsManagerState;
}

const slice = createSlice({
  name: "budgets",
  initialState: await restoreBudgetsSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(createBudget, (state, { payload }) => ({
      ...state,
      [payload.id]: payload,
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
