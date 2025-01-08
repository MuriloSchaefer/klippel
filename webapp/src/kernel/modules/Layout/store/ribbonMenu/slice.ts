import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { addRibbonTab, selectTab} from "./actions";
import { RibbonMenuState } from "./state";

const storage = window.electron.storage;
storage.createDir(".session/Layout/ribbonMenu");


function persistState(state: RibbonMenuState) {
  const f = storage.open(".session/Layout/ribbonMenu/state.js", "w+");
  storage.write(f.fd, JSON.stringify(state), { encoding: "utf-8" });
  storage.close(f.fd);
  return state;
}

const slice = createSlice<RibbonMenuState, SliceCaseReducers<RibbonMenuState>, string>({
    name: `${MODULE_NAME}RibbonMenu`,
    initialState: {
      activeTab: "home",
      tabs: {}
    },
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(addRibbonTab, (state:RibbonMenuState,{ payload: {tab} }) => {
        const {name} = tab
        return persistState({...state, tabs: {...state.tabs, [name]: tab}})
      })
      builder.addCase(selectTab, (state:RibbonMenuState,{ payload: {name} }) => {
        return persistState({...state, activeTab: name})
      })
    }
})

export default slice;