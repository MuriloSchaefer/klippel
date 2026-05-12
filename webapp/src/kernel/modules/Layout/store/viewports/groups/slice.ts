import { createSlice, SliceCaseReducers, SliceSelectors } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import { ViewportGroups, ViewportGroupState } from "../state";
import { createGroup } from "./actions";
import { PathLike } from "fs";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(`.session/Layout/viewPortManager/.groups`);
export const persistVPGroupState = (state:ViewportGroupState ) => {
    storage.writeBlob(
      `.session/Layout/viewPortManager/.groups/${state.name}.json`,
      new Blob([JSON.stringify(state)]),
      { encoding: "utf-8" }
    );
    return state;
}

const restoreSession = async (sessionPath: PathLike = ".session/Layout/viewPortManager/.groups") => {
  const files = await storage.searchDir(sessionPath, ['*.json'], { withFileTypes: true, });
  const state = await files.reduce(async (acc, file) => {
    const fileContent = await storage.readFile<string>(`${sessionPath}/${file.name}`, {encoding: 'utf-8'});
    const content = JSON.parse(fileContent) as ViewportGroupState;
    return {...await acc, [content.name]: content};
  }, {})
  return state;
}

export const groupsRehydrated = defineRehydration<ViewportGroups>(
  `${MODULE_NAME}ViewportsGroups/rehydrated`,
  restoreSession,
);

const slice = createSlice<
  ViewportGroups,
  SliceCaseReducers<ViewportGroups>,
  string,
  SliceSelectors<ViewportGroups>
>({
  name: `${MODULE_NAME}ViewportsGroups`,
  initialState: await restoreSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(groupsRehydrated, (_state, { payload }) => payload as ViewportGroups);
    builder.addCase(createGroup, (state, { payload }) => {
      storage.ensureDir(`.session/Layout/viewPortManager/.groups`);
      return {
        ...state,
        [payload.name]: { name: payload.name, color: payload.color },
      };
    });
  },
});

export default slice;
