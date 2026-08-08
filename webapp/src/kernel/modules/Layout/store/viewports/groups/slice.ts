import { createSlice, SliceCaseReducers, SliceSelectors } from "@reduxjs/toolkit";
import { MODULE_NAME } from "../../../constants";
import { ViewportGroups, ViewportGroupState } from "../state";
import { createGroup, deleteGroup } from "./actions";
import { PathLike } from "fs";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(`.session/Layout/viewPortManager/.groups`);
export const GROUPS_SESSION_PATH = ".session/Layout/viewPortManager/.groups";

export const persistVPGroupState = (state:ViewportGroupState ) => {
    storage.ensureDir(GROUPS_SESSION_PATH);
    storage.writeBlob(
      `${GROUPS_SESSION_PATH}/${state.name}.json`,
      new Blob([JSON.stringify(state)]),
      { encoding: "utf-8" }
    );
    return state;
}

/**
 * Delete the session files of groups that are no longer in state.
 *
 * Called only from the whole-session save. Individual `deleteGroup` commands
 * must not touch `.session/` — the snapshot only moves when the user saves.
 */
export const pruneVPGroupFiles = async (liveNames: string[]) => {
    const keep = new Set(liveNames.map((name) => `${name}.json`));
    try {
      const files = await storage.searchDir(GROUPS_SESSION_PATH, ['*.json'], {
        withFileTypes: true,
      });
      files
        .filter((file) => !keep.has(file.name))
        .forEach((file) =>
          storage.deleteFile(`${GROUPS_SESSION_PATH}/${file.name}`),
        );
    } catch {
      // Nothing persisted yet — nothing to prune.
    }
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
    // Persistence for both cases lives in `groups/middlewares.ts` — reducers
    // stay pure so state transitions are replayable.
    builder.addCase(createGroup, (state, { payload }) => ({
      ...state,
      [payload.name]: {
        name: payload.name,
        color: payload.color,
        label: payload.label,
      },
    }));
    builder.addCase(deleteGroup, (state, { payload }) =>
      Object.values(state).reduce(
        (acc, group) =>
          group.name === payload.name ? acc : { ...acc, [group.name]: group },
        {} as ViewportGroups,
      ),
    );
  },
});

export default slice;
