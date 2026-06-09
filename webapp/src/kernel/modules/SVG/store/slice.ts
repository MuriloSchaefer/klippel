import { createSlice, Store } from "@reduxjs/toolkit";
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
  saveSession,
  removeInstance,
  addInjectedElement,
  updateInjectedElement,
  deleteInjectedElement,
} from "./actions";
import {
  SVGModuleState,
  newSVGState,
  InstancesMap,
  SVGState,
  SVGInstance,
} from "./state";
import _ from "lodash";
import { PathLike } from "fs";

import { defineRehydration, workspaceStorage as storage } from "@kernel/modules/Store/workspaceScope";
storage.ensureDir(".session/SVG/svgs");

export const sessionSaver = (store: Store<SVGModuleState>) => () => {
  store.dispatch(saveSession());
};

export async function persistState({ content, instances, ...state }: SVGState) {
  const rootFolder = `.session/SVG/svgs/${state.path.replaceAll("/", "-")}`;
  await storage.ensureDir(rootFolder);
  const writes: Promise<unknown>[] = [];
  if (content) {
    writes.push(storage.writeBlob(`${rootFolder}/content.svg`, new Blob([content])));
  }
  writes.push(
    storage.writeBlob(
      `${rootFolder}/state.json`,
      new Blob([JSON.stringify(state)]),
      { encoding: "utf-8" },
    ),
  );

  const instancesPath = `${rootFolder}/instances`;
  await storage.ensureDir(instancesPath);
  const filesToKeep: string[] = [];
  Object.entries(instances).forEach(([name, { content, ...state }]) => {
    const statePath = `${instancesPath}/${name}.json`;
    filesToKeep.push(`${name}.json`);
    writes.push(storage.writeBlob(statePath, new Blob([JSON.stringify(state)]), {}));
    if (content) {
      const svgPath = `${instancesPath}/${name}.svg`;
      filesToKeep.push(`${name}.svg`);
      writes.push(storage.writeBlob(svgPath, new Blob([content])));
    }
  });
  await Promise.all(writes);

  const toDelete = await storage.searchDir<string[]>(
    instancesPath,
    ["*.{json,svg}"],
    { ignore: filesToKeep }
  );
  await Promise.all(
    toDelete.map(f => storage.deleteFile(`${instancesPath}/${f}`)),
  );
  return { content, instances, ...state };
}

const restoreSession = async (sessionPath: PathLike = ".session/SVG/svgs/") => {
  const files = await storage.searchDir<string[]>(
    sessionPath,
    ["*/state.json"],
    {}
  );

  const svgs = await files.reduce(async (acc, file) => {
    const folder = file.split("/").slice(0, -1).join("/");
    const fileContent = await storage.readFile<string>(
      `${sessionPath}/${file}`,
      { encoding: "utf-8" }
    );
    const svgState = JSON.parse(fileContent) as SVGState;
    const exists = await storage.exists(`${sessionPath}/${folder}/content.svg`);
    if (exists) {
      svgState.content = await storage.readFile(
        `${sessionPath}/${folder}/content.svg`,
        { encoding: "utf-8" }
      );
    }

    const instancesFiles = await storage.searchDir<string[]>(
      `${sessionPath}/${folder}/instances`,
      ["*.json"],
      {}
    );
    const instances = await instancesFiles.reduce(async (acc, instanceFile) => {
      const name = instanceFile.split("/").at(-1)!.split(".")[0];
      const stateContent = await storage.readFile<string>(
        `${sessionPath}/${folder}/instances/${instanceFile}`,
        { encoding: "utf-8" }
      );
      const state = (await JSON.parse(stateContent)) as SVGInstance;
      const exists = await storage.exists(
        `${sessionPath}/${folder}/instances/${name}.svg`
      );
      if (exists) {
        state.content = await storage.readFile(
          `${sessionPath}/${folder}/instances/${name}.svg`,
          { encoding: "utf-8" }
        );
      }
      return { ...(await acc), [name]: state };
    }, {});
    svgState.instances = instances;
    return { ...acc, [svgState.path]: svgState };
  }, {});
  return { svgs };
};

export const svgRehydrated = defineRehydration<SVGModuleState>(
  `${MODULE_NAME}/rehydrated`,
  restoreSession,
);

const slice = createSlice({
  name: MODULE_NAME,
  initialState: await restoreSession(),
  reducers: {},
  extraReducers: (builder) => {
    builder.addCase(svgRehydrated, (_state, { payload }) => payload);
    builder.addCase(
      loadSVG,
      (state: SVGModuleState, { payload: { path, instanceName } }) => {
        let instances: InstancesMap = {
          [instanceName]: {
            zoom: 1,
            pan: [0, 0],
            proxies: {},
            content: undefined,
          },
        };
        if (state.svgs[path] && !_.isEmpty(state.svgs[path].instances))
          instances = { ...instances, ...state.svgs[path].instances };

        const newState = {
          path,
          ...newSVGState,
          instances: instances,
        };
        return {
          ...state,
          svgs: {
            ...state.svgs,
            [path]: newState,
          },
        };
      }
    );
    builder.addCase(
      fetchSVG,
      (state: SVGModuleState, { payload: { path } }) => ({
        ...state,
        svgs: {
          ...state.svgs,
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
          ...state.svgs,
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                proxies: {
                  ...state.svgs[path].instances[instanceName].proxies,
                  [id]: styles,
                },
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
          ...state.svgs,
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
          ...state.svgs,
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
          ...state.svgs,
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
          ...state.svgs,
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
      addInjectedElement,
      (
        state: SVGModuleState,
        { payload: { path, instanceName, element } }
      ) => ({
        ...state,
        svgs: {
          ...state.svgs,
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                injected: {
                  ...state.svgs[path].instances[instanceName].injected,
                  [element.id]: element,
                },
              },
            },
          },
        },
      })
    );
    builder.addCase(
      updateInjectedElement,
      (
        state: SVGModuleState,
        { payload: { path, instanceName, id, changes } }
      ) => {
        const existing =
          state.svgs[path].instances[instanceName].injected?.[id];
        if (!existing) return state;
        return {
          ...state,
          svgs: {
            ...state.svgs,
            [path]: {
              ...state.svgs[path],
              instances: {
                ...state.svgs[path].instances,
                [instanceName]: {
                  ...state.svgs[path].instances[instanceName],
                  injected: {
                    ...state.svgs[path].instances[instanceName].injected,
                    [id]: { ...existing, ...changes, id },
                  },
                },
              },
            },
          },
        };
      }
    );
    builder.addCase(
      deleteInjectedElement,
      (state: SVGModuleState, { payload: { path, instanceName, id } }) => ({
        ...state,
        svgs: {
          ...state.svgs,
          [path]: {
            ...state.svgs[path],
            instances: {
              ...state.svgs[path].instances,
              [instanceName]: {
                ...state.svgs[path].instances[instanceName],
                injected: Object.entries(
                  state.svgs[path].instances[instanceName].injected ?? {}
                ).reduce(
                  (acc, [key, el]) =>
                    key === id ? acc : { ...acc, [key]: el },
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
      (
        state: SVGModuleState,
        { payload: { path, instanceName, document } }
      ) => ({
        ...state,
        svgs: {
          ...state.svgs,
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

    builder.addCase(
      removeInstance,
      (
        state: SVGModuleState,
        { payload: { path, instanceName } }
      ) => ({
        ...state,
        svgs: {
          ...state.svgs,
          [path]: {
            ...state.svgs[path],
            instances: Object.entries(state.svgs[path].instances).reduce((acc, [name, inst])=> {
              if (name!==instanceName) return {...acc, [name]: inst}
              return acc
            }, {})
          },
        },
      })
    );
  },
});

export default slice;
