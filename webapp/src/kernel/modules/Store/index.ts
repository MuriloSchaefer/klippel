import { IModule, KernelCalls } from "../base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useStoreManager, { StoreManager } from "./hooks/useStoreManager";
import { useAppDispatch, useAppSelector } from "./hooks";
import useComponentRegistryManager from "./hooks/useComponentRegistryManager";
import useFile from "./hooks/useFile";
import useDirectory from "./hooks/useDirectory";
import useSessionDir from "./hooks/useSessionDir";
import useWatchFile from "./hooks/useWatchFile";


export interface Store extends IModule {
    name: typeof MODULE_NAME,
    version: typeof MODULE_VERSION,
    hooks: {
        useAppDispatch: typeof useAppDispatch,
        useAppSelector: typeof useAppSelector
        useFile: typeof useFile,
        useWatchFile: typeof useWatchFile,
        useDirectory: typeof useDirectory,
        useSessionDir: typeof useSessionDir,
    },
    managers: {
        store: typeof useStoreManager
        componentRegistry: typeof useComponentRegistryManager
    },
    kernelCalls: KernelCalls
}

const module: Store = {
    name: MODULE_NAME,
    version: MODULE_VERSION,
    depends_on: [],
    managers: {
        store: useStoreManager,
        componentRegistry: useComponentRegistryManager
    },
    hooks: {
        useAppDispatch, 
        useAppSelector,
        useFile,
        useWatchFile,
        useDirectory,
        useSessionDir
    },
    kernelCalls: {
        startModule: () => null,
        restartModule: () => null,
        shutdownModule: () => null,
    }
}

export default module