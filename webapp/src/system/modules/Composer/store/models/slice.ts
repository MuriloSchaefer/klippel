import { createSlice, Store } from "@reduxjs/toolkit";
import { ComposerModuleState, Model, ModelsMap } from "../../typings";
import { MODULE_NAME } from "../../constants";
import { modelsListed, saveSession } from "./actions";


const initialState: ModelsMap = {
};

const storage = window.electron.storage;
storage.ensureDir(".session/Composer");

export const sessionSaver = (store: Store<ComposerModuleState>) => () => {
  store.dispatch(saveSession());
};

export function persistModel(state: Model){
  const basePath = ".session/Composer/models/"
  storage.writeBlob(`${basePath}/${state.id}.json`, new Blob([JSON.stringify(state)]), {
      encoding: "utf-8",
    });
  return state
}

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(modelsListed, (state, { payload }) => ({
      ...state,
      ...payload.reduce((acc, curr) => ({ ...acc, [curr.id]: curr }), {}),
    }));
  },
});

export default slice;
