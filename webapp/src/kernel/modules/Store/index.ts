import { IModule, KernelCalls } from "../base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useStoreManager from "./hooks/useStoreManager";
import { useAppDispatch, useAppSelector, useCurrentWorkspace } from "./hooks";
import useComponentRegistryManager from "./hooks/useComponentRegistryManager";
import useStorage from "./hooks/useStorage";
import useLog from "./hooks/useLog";
import SessionAutoSaverIcon from "./components/SessionAutoSaverIcon";
import { restartModule } from "./kernelcalls";
import WorkspaceSelector from "./components/WorkspaceSelector";

export interface Store extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  components: {
    SessionAutoSaverIcon: typeof SessionAutoSaverIcon;
    WorkspaceSelector: typeof WorkspaceSelector;
  };
  hooks: {
    useAppDispatch: typeof useAppDispatch;
    useAppSelector: typeof useAppSelector;
    useStorage: typeof useStorage;
    useCurrentWorkspace: typeof useCurrentWorkspace;
    useLog: typeof useLog;
  };
  managers: {
    store: typeof useStoreManager;
    componentRegistry: typeof useComponentRegistryManager;
  };
  kernelCalls: KernelCalls;
}

const module: Store = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: { SessionAutoSaverIcon, WorkspaceSelector },
  managers: {
    store: useStoreManager,
    componentRegistry: useComponentRegistryManager,
  },
  hooks: {
    useAppDispatch,
    useAppSelector,
    useStorage,
    useLog,
    useCurrentWorkspace,
  },
  kernelCalls: {
    startModule: () => null,
    restartModule: restartModule,
    shutdownModule: () => null,
  },
};

export default module;
