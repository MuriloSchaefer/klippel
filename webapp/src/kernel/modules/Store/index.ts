import { IModule, KernelCalls } from "../base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useStoreManager from "./hooks/useStoreManager";
import { useAppDispatch, useAppSelector } from "./hooks";
import useComponentRegistryManager from "./hooks/useComponentRegistryManager";
import useWatchFile from "./hooks/useWatchFile";
import useStorage from "./hooks/useStorage";
import useLog from "./hooks/useLog";


export interface Store extends IModule {
    name: typeof MODULE_NAME,
    version: typeof MODULE_VERSION,
    hooks: {
        useAppDispatch: typeof useAppDispatch,
        useAppSelector: typeof useAppSelector
        useStorage: typeof useStorage,
        useLog: typeof useLog,
        useWatchFile: typeof useWatchFile,
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
        useStorage,
        useLog,
        useWatchFile,
    },
    kernelCalls: {
        startModule: () => null,
        restartModule: () => null,
        shutdownModule: () => null,
    }
}

export default module