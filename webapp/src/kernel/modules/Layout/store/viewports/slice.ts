import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  viewportManagerState, ViewportState
} from "../state";
import { addViewport, closeViewport } from "./actions";


const slice = createSlice<viewportManagerState, SliceCaseReducers<viewportManagerState>, string>({
    name: `${MODULE_NAME}Viewports`,
    initialState: {
      groups: {},
      viewports: {}
    },
    reducers: {},
    extraReducers: (builder) => {
      builder.addCase(addViewport, (state:viewportManagerState,{ payload }) => {

        return {...state, viewports: {...state.viewports,[payload.name]: payload}}
      })
      builder.addCase(closeViewport, (state:viewportManagerState,{ payload }) => {

        return {
          ...state,
          viewports: Object.entries(state.viewports).reduce((newState, [name, vp])=>{
            if (name === payload.name) return newState
            return {...newState, [name]: vp}
          }, {})
        }
      })
    }
})

export default slice;