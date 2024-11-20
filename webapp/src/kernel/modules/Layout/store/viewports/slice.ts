import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import {
  viewportManagerState, ViewportState
} from "./state";
import groupsSlice from './groups/slice'
import { addToGroup, addViewport, closeViewport, removeFromGroup, renameViewport, selectViewport, setExtrasViewport } from "./actions";


const slice = createSlice<viewportManagerState, SliceCaseReducers<viewportManagerState>, string>({
    name: `${MODULE_NAME}Viewports`,
    initialState: {
      groups: {},
      activeViewport: 'home',
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
          activeViewport: 'home',
          viewports: Object.entries(state.viewports).reduce((newState, [name, vp])=>{
            if (name === payload.name) return newState
            return {...newState, [name]: vp}
          }, {})
        }
      })
      builder.addCase(selectViewport, (state:viewportManagerState,{ payload }) => {

        return {...state, activeViewport: payload.name}
      })
      builder.addCase(renameViewport, (state:viewportManagerState,{ payload: {oldName, newName} }) => {
        return {
          ...state,
          viewports: Object.entries(state.viewports).reduce((newState, [name, vp])=>{
            if (name === oldName) return {...newState, [oldName]: {...vp, title: newName}}
            return {...newState, [name]: vp}
          }, {})
        }
      })
      builder.addCase(setExtrasViewport, (state,{ payload: {name, extras} }) => {
        return {
          ...state,
          viewports: Object.entries(state.viewports).reduce((newState, [vpName, vp])=>{
            if (name === vpName) return {...newState, [name]: {...vp, extra: extras}}
            return {...newState, [name]: vp}
          }, {})
        }
      })
      builder.addCase(addToGroup, (state,{ payload: {viewportName, groupName} }) => {
        return {
          ...state,
          viewports: {
            ...state.viewports,
            [viewportName]: {
              ...state.viewports[viewportName],
              group: groupName
            }
          }
        }
      })
      builder.addCase(removeFromGroup, (state,{ payload: {viewportName} }) => {
        return {
          ...state,
          viewports: {
            ...state.viewports,
            [viewportName]: {
              ...state.viewports[viewportName],
              group: undefined
            }
          }
        }
      })

      builder.addDefaultCase((state, action)=>({
        ...state,
        groups: groupsSlice.reducer(state.groups, action)
      }))
    }
})

export default slice;