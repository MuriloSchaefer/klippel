import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";

import {
  ConverterState,
  initialState
} from "./state";
import { selectNode } from "./actions";

const storage = window.electron.storage;
storage.ensureDir(".session/Composer/compositionsManager/compositions");
function persistConverter(state: ConverterState){
  storage.writeBlob(".session/Converter/state.js", new Blob([JSON.stringify(state)]), {
    encoding: "utf-8",
  });
  return state
}


const slice = createSlice({
    name: MODULE_NAME,
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(
        selectNode,
        (state, { payload }) => persistConverter({...state, selectedNode: payload}))
        
    //   builder.addDefaultCase((state, action)=>({
    //     ...state, 
    //     panels: panelsSlice.reducer(state.panels, action),
    //     ribbonMenu: ribbonMenuSlice.reducer(state.ribbonMenu, action),
    //     viewportManager: viewportManagerSlice.reducer(state.viewportManager, action)
    //   }))
    }
})

export default slice;