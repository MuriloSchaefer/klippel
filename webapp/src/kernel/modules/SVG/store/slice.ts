import { createSlice } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../constants";
import {
  addProxy,
  deleteProxy,
  fetchSVG,
  loadSVG,
  setPan,
  setZoom,
  SVGFetched,
  updateSVG,
  updateProxy,
} from "./actions";
import {
  initialState,
  SVGModuleState,
  newSVGState,
  InstancesMap,
} from "./state";
import _ from "lodash";

const slice = createSlice({
  name: MODULE_NAME,
  initialState: initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(
      loadSVG,
      (state: SVGModuleState, { payload: { path, instanceName } }) => {
        let instances: InstancesMap = {
          [instanceName]: {
            zoom: 1,
            pan: [0,0],
            proxies: {},
            content: undefined,
          },
        };
        if (state.svgs[path] && !_.isEmpty(state.svgs[path].instances))
          instances = { ...instances, ...state.svgs[path].instances };

        return {
          ...state,
          svgs: {
            [path]: {
              path,
              ...newSVGState,
              instances: instances,
            },
          },
        };
      }
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
      (state: SVGModuleState, { payload: { path, content } }) => {
        return {
          ...state,
          svgs: {
            ...state.svgs,
            [path]: {
              ...state.svgs[path],
              instances: Object.entries(state.svgs[path].instances).reduce(
                (acc, [name, settings]) => ({
                  ...acc,
                  [name]: { ...settings, content: content },
                }),
                {}
              ),
              progress: "completed",
              content,
            },
          },
        };
      }
    );
    builder.addCase(
      addProxy,
      (
        state: SVGModuleState,
        { payload: { path, instanceName, id, styles } }
      ) => ({
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
      setZoom,
      (state: SVGModuleState, { payload: { path, instanceName, zoom } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                zoom: zoom,
              },
            },
          },
        },
      })
    );
    builder.addCase(
      setPan,
      (state: SVGModuleState, { payload: { path, instanceName, x, y } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                pan: [x, y],
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
                  [id]: state.svgs[path].instances[instanceName].proxies
                    ? {
                        ...state.svgs[path].instances[instanceName].proxies[id],
                        ...changes,
                      }
                    : changes,
                },
              },
            },
          },
        },
      })
    );
    builder.addCase(
      deleteProxy,
      (state: SVGModuleState, { payload: { path, instanceName, id } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                proxies: Object.entries(
                  state.svgs[path].instances[instanceName].proxies
                ).reduce(
                  (acc, [key, proxy]) =>
                    key === id ? acc : { ...acc, [key]: proxy },
                  {}
                ),
              },
            },
          },
        },
      })
    );

    builder.addCase(
      updateSVG,
      (state: SVGModuleState, { payload: { path, instanceName, document } }) => ({
        ...state,
        svgs: {
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                content: document,
              },
            },
          },
        },
      })
    );
  },
});

export default slice;
