import { loadSVG, SVGLoaded } from "@kernel/modules/SVG/store/actions";
import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import { createComposition, modelExtracted, parseSVG, selectPart, SVGParsed } from "./actions";
import { initialState, ComposerState, newCompositionState } from "./state";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      createComposition,
      (
        state: ComposerState,
        { payload: { name, viewportName, svgPath, graphId } }
      ) => ({
        ...state,
        compositionsManager: {
          ...state.compositionsManager,
          compositions: {
            ...state.compositionsManager.compositions,
            [name]: {
              ...newCompositionState,
              name,
              svgPath,
              graphId,
              viewportName,
            },
          },
        },
      })
    );

    builder.addCase(loadSVG, (state: ComposerState, { payload: { path } }) => {
      const composition = Object.values(
        state.compositionsManager.compositions
      ).find((comp) => comp.svgPath === path);
      if (!composition) return state;
      return {
        ...state,
        compositionsManager: {
          compositions: {
            ...state.compositionsManager.compositions,
            [composition.name]: {
              ...composition,
              loading: {
                ...composition.loading,
                loadSVG: "started",
              },
            },
          },
        },
      };
    });

    builder.addCase(
      SVGLoaded,
      (state: ComposerState, { payload: { path } }) => {
        const composition = Object.values(
          state.compositionsManager.compositions
        ).find((comp) => comp.svgPath === path);
        if (!composition) return state;
        return {
          ...state,
          compositionsManager: {
            compositions: {
              ...state.compositionsManager.compositions,
              [composition.name]: {
                ...composition,
                loading: {
                  ...composition.loading,
                  loadSVG: "completed",
                },
              },
            },
          },
        };
      }
    );

    builder.addCase(
      parseSVG,
      (state: ComposerState, { payload: { compositionName } }) => {
        return {
          ...state,
          compositionsManager: {
            compositions: {
              ...state.compositionsManager.compositions,
              [compositionName]: {
                ...state.compositionsManager.compositions[compositionName],
                loading: {
                  ...state.compositionsManager.compositions[compositionName]
                    .loading,
                  parseSVG: "started",
                },
              },
            },
          },
        };
      }
    );

    builder.addCase(
      modelExtracted,
      (state: ComposerState, { payload: {compositionName, model} }) => {
        return {
          ...state,
          compositionsManager: {
            compositions: {
              ...state.compositionsManager.compositions,
              [compositionName]: {
                ...state.compositionsManager.compositions[compositionName],
                model: model
              },
            },
          },
        };
      }
    );

    builder.addCase(SVGParsed, (state: ComposerState, { payload }) => {
      return {
        ...state,
        compositionsManager: {
          compositions: {
            ...state.compositionsManager.compositions,
            [payload.name]: {
              ...state.compositionsManager.compositions[payload.name],
              loading: {
                ...state.compositionsManager.compositions[payload.name].loading,
                parseSVG: "completed",
              },
            },
          },
        },
      };
    });

    builder.addCase(
      selectPart,
      (
        state: ComposerState,
        { payload: { compositionName, partName } }
      ) => ({
        ...state,
        compositionsManager: {
          ...state.compositionsManager,
          compositions: {
            ...state.compositionsManager.compositions,
            [compositionName]: {
                ...state.compositionsManager.compositions[compositionName],
                selectedPart: partName
            },
          },
        },
      })
    );
  },
});

export default slice;
