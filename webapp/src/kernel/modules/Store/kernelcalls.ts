// graphs manager

import { StartModuleProps } from "../base";
import { SYSTEM_TRAY_REGISTRY_NAME } from "../Layout/constants";
import { listWorkspaces } from "./actions";
import SessionAutoSaverIcon from "./components/SessionAutoSaverIcon";
import WorkspaceSelector from "./components/WorkspaceSelector";
import { sessionSaver } from "./slice";
import type { StoreState } from "./state";


export const restartModule = ({
  managers: { storeManager, componentRegistryManager },storage, dispatch
}: StartModuleProps) => {

  // configure session saver
  const store = storeManager.functions.getStore()
  storage.registerSessionSaveListener(
    store ? sessionSaver(store) : ()=>console.log('Missing store. skipping session save!')
  );

  componentRegistryManager.functions.registerComponents({[SYSTEM_TRAY_REGISTRY_NAME]: {
    workspaceSelector: WorkspaceSelector,
    sessionAutoSaverIcon: SessionAutoSaverIcon
  }})

  dispatch(listWorkspaces())

  // Boot-time Jazz attach: open the persisted workspace's Jazz node so
  // domain modules can hit the model IPC immediately on app start. Workspaces
  // without a `workspaces.index.json` entry (legacy file-only) are skipped.
  void (async () => {
    try {
      const state = store?.getState() as { Store: StoreState } | undefined;
      const selected = state?.Store?.selectedWorkspace;
      if (!selected) return;
      // `ensureWorkspace` is idempotent and self-heals stale index entries
      // (e2e `resetWorkspace` wipes the dir but leaves the index entry; on
      // boot we'd otherwise hit "workspace has no coId"). Single call covers
      // the open-existing, fresh-bootstrap, and stale-entry cases.
      await globalThis.electron.jazz.ensureWorkspace(selected);
    } catch (err) {
      console.error("[Store/boot] Jazz attach failed", err);
    }
  })();
};
