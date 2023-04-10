import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import {
  addProxy,
  fetchSVG,
  loadSVG,
  SVGFetched,
  updateProxy,
} from "./actions";
import { initialState, SVGModuleState, newSVGState } from "./state";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      loadSVG,
      (state: SVGModuleState, { payload: { path,instanceName } }) => ({
        ...state,
        svgs: {
          [path]: {
            path,
            ...newSVGState,
            instances: {
              [instanceName]: {
                zoom: 1,
                pan: [0,0],
                proxies: {}
              }
            }
          },
        },
      })
    );
    builder.addCase(
      fetchSVG,
      (state: SVGModuleState, { payload: { path } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            progress: "started",
          },
        },
      })
    );
    builder.addCase(
      SVGFetched,
      (state: SVGModuleState, { payload: { path, content } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            progress: "completed",
            content,
          },
        },
      })
    );
    builder.addCase(
      addProxy,
      (state: SVGModuleState, { payload: { path, instanceName, id, styles } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                proxies: state.svgs[path].instances[instanceName]
                  ? {
                      ...state.svgs[path].instances[instanceName].proxies,
                      [id]: styles,
                    }
                  : { [id]: styles },
              },
            },
          },
        },
      })
    );
    builder.addCase(
      updateProxy,
      (
        state: SVGModuleState,
        { payload: { path, instanceName, id, changes } }
      ) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                proxies: {
                  ...state.svgs[path].instances[instanceName].proxies,
                  [id]: state.svgs[path].instances[instanceName].proxies ? {
                    ...state.svgs[path].instances[instanceName].proxies[id],
                    ...changes,
                  } : changes
                }
              },
            },
          },
        },
      })
    );
  },
});

export default slice;
