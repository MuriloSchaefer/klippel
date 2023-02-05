import { loadSVG, SVGLoaded } from "@kernel/modules/SVG/store/actions";
import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { createComposition, parseSVG, SVGParsed } from "./actions";
import { initialState, ComposerState, newCompositionState } from "./state";

const slice = createSlice({
    name: MODULE_NAME,
    initialState: initialState,
    reducers: {},
    extraReducers: (builder) => {
        
      builder.addCase(
        createComposition,
        (state: ComposerState, { payload: { name, svgPath, graphId } }) => ({
            ...state, 
            compositionsManager: {
                ...state.compositionsManager,
                compositions: {
                    ...state.compositionsManager.compositions,
                    [name]: {
                        ...newCompositionState,
                        name, svgPath, graphId
                    }
                }
            }
        }))

        builder.addCase(
            loadSVG,
            (state: ComposerState, { payload: { path } }) => {
                const composition = Object.values(state.compositionsManager.compositions).find(comp => comp.svgPath === path)
                if (!composition) return state
                return {...state, compositionsManager: {
                    compositions: {
                        ...state.compositionsManager.compositions,
                        [composition.name]: {
                            ...composition,
                            loading: {
                                ...composition.loading,
                                loadSVG: 'started'
                            }
                        }
                    }
                }}
            })

        builder.addCase(
            SVGLoaded,
            (state: ComposerState, { payload: { path } }) => {
                const composition = Object.values(state.compositionsManager.compositions).find(comp => comp.svgPath === path)
                if (!composition) return state
                return {...state, compositionsManager: {
                    compositions: {
                        ...state.compositionsManager.compositions,
                        [composition.name]: {
                            ...composition,
                            loading: {
                                ...composition.loading,
                                loadSVG: 'completed'
                            }
                        }
                    }
                }}
            })

            builder.addCase(
                parseSVG,
                (state: ComposerState, { payload: { compositionName } }) => {
                    return {...state, compositionsManager: {
                        compositions: {
                            ...state.compositionsManager.compositions,
                            [compositionName]: {
                                ...state.compositionsManager.compositions[compositionName],
                                loading: {
                                    ...state.compositionsManager.compositions[compositionName].loading,
                                    parseSVG: 'started'
                                }
                            }
                        }
                    }}
                })

            builder.addCase(
                SVGParsed,
                (state: ComposerState, { payload }) => {
                    return {...state, compositionsManager: {
                        compositions: {
                            ...state.compositionsManager.compositions,
                            [payload.name]: {
                                ...state.compositionsManager.compositions[payload.name],
                                loading: {
                                    ...state.compositionsManager.compositions[payload.name].loading,
                                    parseSVG: 'completed'
                                }
                            }
                        }
                    }}
                })
    }
})

export default slice;