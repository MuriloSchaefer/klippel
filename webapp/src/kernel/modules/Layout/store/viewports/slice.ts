import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  viewportManagerState, ViewportState
} from "../state";
import { addViewport, closeViewport, renameViewport } from "./actions";


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
      builder.addCase(renameViewport, (state:viewportManagerState,{ payload: {oldName, newName} }) => {
        console.log(state.viewports, oldName, newName)
        return {
          ...state,
          viewports: Object.entries(state.viewports).reduce((newState, [name, vp])=>{
            console.log(name, oldName)
            if (name === oldName) return {...newState, [oldName]: {...vp, title: newName}}
            return {...newState, [name]: vp}
          }, {})
        }
      })
    }
})

export default slice;