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
storage.createDir(".session/Layout/viewPortManager/viewports");

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
      const stateFile = storage.open(
        `.session/Layout/viewPortManager/viewports/${payload.name}.js`,
        "w+"
      );
      storage.write(stateFile.path, JSON.stringify(payload), {
        encoding: "utf-8",
      });
      storage.close(stateFile.fd);

      return {
        ...state,
        viewports: { ...state.viewports, [payload.name]: payload },
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

        storage.move(
          `.session/Layout/viewPortManager/viewports/${oldName}.js`,
          `.session/Layout/viewPortManager/viewports/${newName}.js`,
          {}
        );
        storage.write(
          `.session/Layout/viewPortManager/viewports/${newName}.js`,
          JSON.stringify(newState.viewports[newName]),
          { encoding: "utf-8" }
        );

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
        storage.write(
          `.session/Layout/viewPortManager/viewports/${name}.js`,
          JSON.stringify(newState.viewports[name]),
          { encoding: "utf-8" }
        );
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
        storage.write(
          `.session/Layout/viewPortManager/viewports/${viewportName}.js`,
          JSON.stringify(newState.viewports[viewportName]),
          { encoding: "utf-8" }
        );
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
      storage.write(
        `.session/Layout/viewPortManager/viewports/${viewportName}.js`,
        JSON.stringify(newState.viewports[viewportName]),
        { encoding: "utf-8" }
      );
      return newState;
    });

    builder.addDefaultCase((state, action) => ({
      ...state,
      groups: groupsSlice.reducer(state.groups, action),
    }));
  },
});

export default slice;
