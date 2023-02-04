import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { createComposition } from "./actions";
import { initialState, ComposerState, newCompositionState } from "./state";

const slice = createSlice({
    name: MODULE_NAME,
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
        
      builder.addCase(
        createComposition,
        (state: ComposerState, { payload: { name, svgPath } }) => ({
            ...state, 
            compositionsManager: {
                ...state.compositionsManager,
                compositions: {
                    ...state.compositionsManager.compositions,
                    [name]: {
                        ...newCompositionState,
                        name, svgPath
                    }
                }
            }
        }))
    }
})

export default slice;