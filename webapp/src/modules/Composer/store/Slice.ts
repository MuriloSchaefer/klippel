import { createSlice } from "@reduxjs/toolkit";

import {
  viewportAdded,
  viewportSelected,
} from "@kernel/modules/LayoutModule/ations";
import { UIState } from "./state";

import {
  parseGarment,
  materialSelectedEvent,
  garmentParseFinished,
  setSVGPath,
} from "./actions";
import { loadSVG, SVGLoaded } from "@kernel/modules/SVGModule/store/actions";

const UIInitialState: UIState = {
  viewports: {
  },
};

export const composerSlice = createSlice({
  name: "composer",
  initialState: UIInitialState,
  reducers: {},
  // The `extraReducers` field use actions created outside the slice, therefore we can add proper naming
  extraReducers: (builder) => {
    builder
      .addCase(viewportAdded, (state: UIState, action) => ({
        ...state,
        viewports: {
          ...state.viewports,
          [action.payload.id]: {
            ...state.viewports[action.payload.id],

            UI: {
              settingsPanel: {},
              detailsPanel: {
                selectedMaterialId: null,
              },
              loaders: {
                loadSVG: "not-started",
                parseSVG: {
                  garment: "not-started",
                  mannequin: "not-started",
                  annotations: "not-started",
                }
              }
            },
            viewportId: action.payload.id,
            graphId: action.payload.id, // TODO: check if that is right
          }
        },
      }))
      .addCase(setSVGPath, (state: UIState, action) => ({
        ...state,

        viewports: {
          ...state.viewports,
          [action.payload.viewportId]: {
            ...state.viewports[action.payload.viewportId],
            svgPath: action.payload.svgPath
          }
        }
      }))
      .addCase(loadSVG, (state: UIState, action) => {
        const viewports = Object.values(state.viewports).filter(vp => vp.svgPath === action.payload.path)
        const updatedViewports = viewports.map(vp => ({
          ...state.viewports[vp.viewportId],
          UI: {
            ...state.viewports[vp.viewportId].UI,
            loaders: {
              ...state.viewports[vp.viewportId].UI.loaders,
              loadSVG: "started"
            }
          }
        }))
        return {
          ...state,
          viewports: {
            ...state.viewports,
            ...updatedViewports.reduce((acc, curr) => ({
              ...acc,
              [curr.viewportId]: curr
            }), {})
          },
        }
      })
      .addCase(SVGLoaded, (state: UIState, action) => {
        const viewports = Object.values(state.viewports).filter(vp => vp.svgPath === action.payload.path)
        const updatedViewports = viewports.map(vp => ({
          ...state.viewports[vp.viewportId],
          UI: {
            ...state.viewports[vp.viewportId].UI,
            loaders: {
              ...state.viewports[vp.viewportId].UI.loaders,
              loadSVG: "finished"
            }
          }
        }))
        return {
          ...state,
          viewports: {
            ...state.viewports,
            ...updatedViewports.reduce((acc, curr) => ({
              ...acc,
              [curr.viewportId]: curr
            }), {})
          },
        }
      })
      .addCase(parseGarment, (state: UIState, action) => ({
        ...state,
        viewports: {
          ...state.viewports,
          [action.payload.viewportId]: {
            ...state.viewports[action.payload.viewportId],
            UI: {
              ...state.viewports[action.payload.viewportId].UI,
              loaders: {
                ...state.viewports[action.payload.viewportId].UI.loaders,
                parseSVG: {
                  ...state.viewports[action.payload.viewportId].UI.loaders.parseSVG,
                  garment: "started"
                }
              }
            }
          }
        }
      }))
      .addCase(garmentParseFinished, (state: UIState, action) => ({
        ...state,
        viewports: {
          ...state.viewports,
          [action.payload.viewportId]: {
            ...state.viewports[action.payload.viewportId],
            UI: {
              ...state.viewports[action.payload.viewportId].UI,
              loaders: {
                ...state.viewports[action.payload.viewportId].UI.loaders,
                parseSVG: {
                  ...state.viewports[action.payload.viewportId].UI.loaders.parseSVG,
                  garment: "finished"
                }
              }
            }
          }
        }
      }))
      .addCase(materialSelectedEvent, (state: UIState, action) => ({
        ...state,
        viewports: {
          ...state.viewports,
          [action.payload.viewportId]: {
            ...state.viewports[action.payload.viewportId],
            UI: {
              ...state.viewports[action.payload.viewportId].UI,
              detailsPanel: {
                selectedMaterialId: action.payload.id
              }
            }
          }
        }
      }))
    // .addCase(SVGLoaded, (state: UIState) => ({
    //   ...state,
    //   viewport: {
    //     ...state.viewports,
    //     loadingSVG: false,
    //   },
    // }))
    // .addCase(parseGarment, (state: UIState) => ({
    //   ...state,
    //   viewport: {
    //     ...state.viewport,
    //     parsing: {
    //       ...state.viewport.parsing,
    //       garment: true,
    //     },
    //   },
    // }))
    // .addCase(garmentParseFinished, (state: UIState) => ({
    //   ...state,
    //   viewport: {
    //     ...state.viewport,
    //     parsing: {
    //       ...state.viewport.parsing,
    //       garment: false,
    //     },
    //   },
    // }))
    // .addCase(materialSelectedEvent, (state: UIState, action) => ({
    //   ...state,
    //   rightPanel: {
    //     ...state.rightPanel,
    //     selectedMaterialId: action.payload.id,
    //   },
    // }));
  },
});

export default composerSlice.reducer;
