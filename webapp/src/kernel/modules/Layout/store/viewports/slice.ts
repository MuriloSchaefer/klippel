import { createSlice, SliceCaseReducers, SliceSelectors } from "@reduxjs/toolkit";
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
import { PathLike } from "fs";

const storage = globalThis.electron.storage;
storage.ensureDir(".session/Layout/viewPortManager/viewports");

export const persistViewportState = (state: ViewportState) => {
  storage.writeBlob(
    `.session/Layout/viewPortManager/viewports/${state.name}.json`,
    new Blob([JSON.stringify(state)]),
    { encoding: "utf-8" }
  );
  return state;
};

export const persistActiveVP = (vpName: string) => {
  storage.writeBlob(
    `.session/Layout/viewPortManager/activeViewport.json`,
    new Blob([vpName]),
    { encoding: "utf-8" }
  );
  return vpName;
};

const restoreSession = async (
  sessionPath: PathLike = ".session/Layout/viewPortManager/viewports"
): Promise<{ [name: string]: ViewportState }> => {
  const files = await storage.searchDir(sessionPath, ["*.json"], {
    withFileTypes: true,
  });
  const state = await files.reduce(async (acc, file) => {
    const content = JSON.parse(
      await storage.readFile<string>(`${sessionPath}/${file.name}`, {
        encoding: "utf-8",
      })
    ) as ViewportState;
    return {...await acc, [content.name]: content };
  }, {});

  return {
    ...state,
    home: {
      name: "home",
      title: "",
      type: "home",
    },
  } as { [name: string]: ViewportState };
};

const restoreActiveVPSession = async (
  sessionPath: PathLike = ".session/Layout/viewPortManager"
) => {
  const exists = await storage.exists(`${sessionPath}/activeViewport.json`);
  if (!exists) return "home";
  const vpName = await storage.readFile<string>(
    `${sessionPath}/activeViewport.json`,
    { encoding: "utf-8" }
  );
  return vpName;
};

const slice = createSlice<
  viewportManagerState,
  SliceCaseReducers<viewportManagerState>,
  string,
  SliceSelectors<viewportManagerState>
>({
  name: `${MODULE_NAME}Viewports`,
  initialState: {
    groups: groupsSlice.getInitialState(),
    activeViewport: await restoreActiveVPSession(),
    viewports: await restoreSession(),
  },
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(addViewport, (state: viewportManagerState, { payload }) => {
      return {
        ...state,
        viewports: {
          ...state.viewports,
          [payload.name]: payload,
        },
      };
    });
    builder.addCase(
      closeViewport,
      (state: viewportManagerState, { payload }) => {
        storage.deleteFile(
          `.session/Layout/viewPortManager/viewports/${payload.name}.json`
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
          `.session/Layout/viewPortManager/viewports/${oldName}.json`,
          `.session/Layout/viewPortManager/viewports/${newName}.json`
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
              return { ...newState, [vpName]: vp };
            },
            {}
          ),
        };
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
      return newState;
    });

    builder.addDefaultCase((state, action) => ({
      ...state,
      groups: groupsSlice.reducer(state.groups, action),
    }));
  },
});

export default slice;
