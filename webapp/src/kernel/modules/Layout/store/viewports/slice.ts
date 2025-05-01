import { createSlice, SliceCaseReducers } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../constants";
import { viewportManagerState, ViewportState } from "./state";
import groupsSlice from "./groups/slice";
import {
  addToGroup,
  addViewport,
  closeViewport,
  removeFromGroup,
  renameViewport,
  selectViewport,
  setExtrasViewport,
} from "./actions";

const storage = window.electron.storage;
storage.ensureDir(".session/Layout/viewPortManager/viewports");

const persistViewportState = (state: ViewportState) => {
  storage.writeBlob(
    `.session/Layout/viewPortManager/viewports/${state.name}.js`,
    new Blob([JSON.stringify(state)]),
    { encoding: "utf-8" }
  );
  return state;
}

const slice = createSlice<
  viewportManagerState,
  SliceCaseReducers<viewportManagerState>,
  string
>({
  name: `${MODULE_NAME}Viewports`,
  initialState: {
    groups: {},
    activeViewport: "home",
    viewports: {},
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(addViewport, (state: viewportManagerState, { payload }) => {

      return {
        ...state,
        viewports: { ...state.viewports, [payload.name]: persistViewportState(payload) },
      };
    });
    builder.addCase(
      closeViewport,
      (state: viewportManagerState, { payload }) => {
        storage.deleteFile(
          `.session/Layout/viewPortManager/viewports/${payload.name}.js`
        );
        return {
          ...state,
          activeViewport: "home",
          viewports: Object.entries(state.viewports).reduce(
            (newState, [name, vp]) => {
              if (name === payload.name) return newState;
              return { ...newState, [name]: vp };
            },
            {}
          ),
        };
      }
    );
    builder.addCase(
      selectViewport,
      (state: viewportManagerState, { payload }) => {
        storage.deleteFile('.session/Layout/viewPortManager/activeViewport.js')
        storage.symLink(
          `.session/Layout/viewPortManager/viewports/${payload.name}.js`,
          ".session/Layout/viewPortManager/activeViewport.js"
        );

        return { ...state, activeViewport: payload.name };
      }
    );
    builder.addCase(
      renameViewport,
      (state: viewportManagerState, { payload: { oldName, newName } }) => {
        const newState: viewportManagerState = {
          ...state,
          viewports: Object.entries(state.viewports).reduce(
            (newState, [name, vp]) => {
              if (name === oldName)
                return { ...newState, [newName]: { ...vp, title: newName } };
              return { ...newState, [name]: vp };
            },
            {}
          ),
        };

        storage.moveFile(
          `.session/Layout/viewPortManager/viewports/${oldName}.js`,
          `.session/Layout/viewPortManager/viewports/${newName}.js`,
        );
        persistViewportState(newState.viewports[newName]);

        return newState;
      }
    );
    builder.addCase(
      setExtrasViewport,
      (state, { payload: { name, extras } }) => {
        const newState: viewportManagerState = {
          ...state,
          viewports: Object.entries(state.viewports).reduce(
            (newState, [vpName, vp]) => {
              if (name === vpName)
                return { ...newState, [name]: { ...vp, extra: extras } };
              return { ...newState, [name]: vp };
            },
            {}
          ),
        };
        persistViewportState(newState.viewports[name]);
        return newState;
      }
    );
    builder.addCase(
      addToGroup,
      (state, { payload: { viewportName, groupName } }) => {
        const newState: viewportManagerState = {
          ...state,
          viewports: {
            ...state.viewports,
            [viewportName]: {
              ...state.viewports[viewportName],
              group: groupName,
            },
          },
        };
        
        persistViewportState(newState.viewports[viewportName]);
        return newState;
      }
    );
    builder.addCase(removeFromGroup, (state, { payload: { viewportName } }) => {
      const newState = {
        ...state,
        viewports: {
          ...state.viewports,
          [viewportName]: {
            ...state.viewports[viewportName],
            group: undefined,
          },
        },
      };
      persistViewportState(newState.viewports[viewportName]);
      return newState;
    });

    builder.addDefaultCase((state, action) => ({
      ...state,
      groups: groupsSlice.reducer(state.groups, action),
    }));
  },
});

export default slice;
