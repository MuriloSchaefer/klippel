// graphs manager

import { StartModuleProps } from "../base";
import { SYSTEM_TRAY_REGISTRY_NAME } from "../Layout/constants";
import { listWorkspaces } from "./actions";
import SessionAutoSaverIcon from "./components/SessionAutoSaverIcon";
import WorkspaceSelector from "./components/WorkspaceSelector";
import { sessionSaver } from "./slice";


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
};
