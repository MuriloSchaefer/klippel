import { loadSVG, SVGLoaded } from "@kernel/modules/SVG/store/actions";
import { createSlice, Store } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import {
  createComposition,
  fetchModel,
  modelStored,
  closeComposition,
  storeCompositionsList,
  saveSession,
} from "./actions";
import { CompositionState, newCompositionState } from "./composition/state";
import { ComposerState, CompositionsMap } from "./state";

import instanceSlice from "./composition/slice";
import {
  addGradeToBudget,
  addToBudget,
  changeGradeCounter,
  openDebugView,
  selectPart,
  unselectPart,
} from "./composition/actions";
import { PathLike } from "fs";
const storage = window.electron.storage;
storage.ensureDir(".session/Composer/compositionsManager/compositions");

export const sessionSaver = (store: Store<CompositionState>) => () => {
  store.dispatch(saveSession());
};

export function persistCompositionState(state: CompositionState) {
  storage.writeBlob(
    `.session/Composer/compositionsManager/compositions/${state.name}.json`,
    new Blob([JSON.stringify(state)]),
    {
      encoding: "utf-8",
    }
  );
  return state;
}
const restoreCompositionsSession = async (
  sessionPath: PathLike = ".session/Composer/compositionsManager/compositions"
) => {
  const files = await storage.searchDir(sessionPath, ["*.json"], {
    withFileTypes: true,
  });
  const state = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(
      `${sessionPath}/${file.name}`,
      { encoding: "utf-8" }
    );
    const content = JSON.parse(fileContent) as CompositionState;
    return { ...(await acc), [content.name]: content };
  }, {});
  return state as CompositionsMap;
};

const slice = createSlice({
  name: MODULE_NAME,
  initialState: {
    compositionsManager: {
      compositionsList: [],
      compositions: await restoreCompositionsSession(),
    },
  } as ComposerState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(
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
      )
      .addCase(storeCompositionsList, (state, action) => {
        return {
          ...state,
          compositionsManager: {
            ...state.compositionsManager,
            compositionsList: action.payload,
          },
        };
      })
      .addCase(
        closeComposition,
        (state: ComposerState, { payload: { name } }) => {
          storage.deleteFile(
            `.session/Composer/compositionsManager/compositions/${name}.json`
          );
          return {
            ...state,
            compositionsManager: {
              ...state.compositionsManager,
              compositions: Object.values(
                state.compositionsManager.compositions
              ).reduce((newState, comp) => {
                if (comp.name === name) return newState;
                return { ...newState, [comp.name]: comp };
              }, {}),
            },
          };
        }
      )
      .addCase(loadSVG, (state: ComposerState, { payload: { path } }) => {
        const composition = Object.values(
          state.compositionsManager.compositions
        ).find((comp) => comp.svgPath === path);
        if (!composition) return state;
        return {
          ...state,
          compositionsManager: {
            ...state.compositionsManager,
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
            ...state.compositionsManager,
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
      fetchModel,
      (state: ComposerState, { payload: { compositionName } }) => {
        return {
          ...state,
          compositionsManager: {
            ...state.compositionsManager,
            compositions: {
              ...state.compositionsManager.compositions,
              [compositionName]: {
                ...state.compositionsManager.compositions[compositionName],
                loading: {
                  ...state.compositionsManager.compositions[compositionName]
                    .loading,
                  loadModel: "started",
                },
              },
            },
          },
        };
      }
    );
    builder.addCase(modelStored, (state: ComposerState, { payload }) => {
      return {
        ...state,
        compositionsManager: {
          ...state.compositionsManager,
          compositions: {
            ...state.compositionsManager.compositions,
            [payload.compositionName]: {
              ...state.compositionsManager.compositions[
                payload.compositionName
              ],
              loading: {
                ...state.compositionsManager.compositions[
                  payload.compositionName
                ].loading,
                loadModel: "completed",
              },
            },
          },
        },
      };
    });

    // instance actions
    builder.addCase(selectPart, (state: ComposerState, action) => ({
      ...state,
      compositionsManager: {
        ...state.compositionsManager,
        compositions: {
          ...state.compositionsManager.compositions,

          [action.payload.compositionName]: instanceSlice.reducer(
            state.compositionsManager.compositions[
              action.payload.compositionName
            ],
            action
          ),
        },
      },
    }));
    builder.addCase(unselectPart, (state: ComposerState, action) => ({
      ...state,
      compositionsManager: {
        ...state.compositionsManager,
        compositions: {
          ...state.compositionsManager.compositions,

          [action.payload.compositionName]: instanceSlice.reducer(
            state.compositionsManager.compositions[
              action.payload.compositionName
            ],
            action
          ),
        },
      },
    }));

    builder.addCase(openDebugView, (state: ComposerState, action) => ({
      ...state,
      compositionsManager: {
        ...state.compositionsManager,
        compositions: {
          ...state.compositionsManager.compositions,

          [action.payload.compositionName]: instanceSlice.reducer(
            state.compositionsManager.compositions[
              action.payload.compositionName
            ],
            action
          ),
        },
      },
    }));

    builder.addCase(addToBudget, (state: ComposerState, action) => ({
      ...state,
      compositionsManager: {
        ...state.compositionsManager,
        compositions: {
          ...state.compositionsManager.compositions,

          [action.payload.compositionName]: instanceSlice.reducer(
            state.compositionsManager.compositions[
              action.payload.compositionName
            ],
            action
          ),
        },
      },
    }));

    builder.addCase(addGradeToBudget, (state: ComposerState, action) => ({
      ...state,
      compositionsManager: {
        ...state.compositionsManager,
        compositions: {
          ...state.compositionsManager.compositions,

          [action.payload.compositionName]: instanceSlice.reducer(
            state.compositionsManager.compositions[
              action.payload.compositionName
            ],
            action
          ),
        },
      },
    }));

    builder.addCase(changeGradeCounter, (state: ComposerState, action) => ({
      ...state,
      compositionsManager: {
        ...state.compositionsManager,
        compositions: {
          ...state.compositionsManager.compositions,

          [action.payload.compositionName]: instanceSlice.reducer(
            state.compositionsManager.compositions[
              action.payload.compositionName
            ],
            action
          ),
        },
      },
    }));
  },
});

export default slice;
