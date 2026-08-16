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
  setViewportHasChanged,
} from "./actions";
import { PathLike } from "fs";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
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

const DIRTY_SESSION_PATH = ".session/Layout/viewPortManager/dirtyViewports.json";

export const persistDirtyViewports = (dirtyViewports: { [name: string]: boolean }) => {
  storage.writeBlob(
    DIRTY_SESSION_PATH,
    new Blob([JSON.stringify(dirtyViewports)]),
    { encoding: "utf-8" },
  );
};

const restoreDirtyViewports = async (): Promise<{ [name: string]: boolean }> => {
  const exists = await storage.exists(DIRTY_SESSION_PATH);
  if (!exists) return {};
  const content = await storage.readFile<string>(DIRTY_SESSION_PATH, { encoding: "utf-8" });
  return JSON.parse(content) as { [name: string]: boolean };
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

const buildInitialState = async (): Promise<viewportManagerState> => {
  const viewports = await restoreSession();
  const activeViewport = await restoreActiveVPSession();
  return {
    groups: groupsSlice.getInitialState(),
    // The pointer and the viewport states are separate files, so the pointer
    // can name a tab that was never written back (or was pruned by a later
    // save). Resolve it here, where both halves are in hand, rather than
    // shipping a name that selects nothing — `home` always exists.
    activeViewport: viewports[activeViewport] ? activeViewport : "home",
    viewports,
    dirtyViewports: await restoreDirtyViewports(),
  };
};

export const viewportsRehydrated = defineRehydration<viewportManagerState>(
  `${MODULE_NAME}Viewports/rehydrated`,
  buildInitialState,
);

const slice = createSlice<
  viewportManagerState,
  SliceCaseReducers<viewportManagerState>,
  string,
  SliceSelectors<viewportManagerState>
>({
  name: `${MODULE_NAME}Viewports`,
  initialState: await buildInitialState(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(addViewport, (state: viewportManagerState, { payload }) => {
      return {
        ...state,
        viewports: {
          ...state.viewports,
          [payload.name]: payload,
        },
        dirtyViewports: { ...state.dirtyViewports, [payload.name]: false },
      };
    });
    builder.addCase(setViewportHasChanged, (state, { payload: { name, hasChanged } }) => {
      if (state.dirtyViewports[name] === hasChanged) return state;
      return {
        ...state,
        dirtyViewports: { ...state.dirtyViewports, [name]: hasChanged },
      };
    });
    builder.addCase(
      closeViewport,
      (state: viewportManagerState, { payload }) => {
        storage.deleteFile(
          `.session/Layout/viewPortManager/viewports/${payload.name}.json`
        );
        const { [payload.name]: _removed, ...remainingDirty } = state.dirtyViewports;
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
          dirtyViewports: remainingDirty,
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

    builder.addCase(viewportsRehydrated, (_state, { payload }) => payload);

    builder.addDefaultCase((state, action) => ({
      ...state,
      groups: groupsSlice.reducer(state.groups, action),
    }));
  },
});

export default slice;
