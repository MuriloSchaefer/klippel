import { IModule, KernelCalls } from "../base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useStoreManager, { StoreManager } from "./hooks/useStoreManager";
import { useAppDispatch, useAppSelector } from "./hooks";
import useComponentRegistryManager from "./hooks/useComponentRegistryManager";


export interface Store extends IModule {
    name: typeof MODULE_NAME,
    version: typeof MODULE_VERSION,
    hooks: {
        useAppDispatch: typeof useAppDispatch,
        useAppSelector: typeof useAppSelector
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
    },
    kernelCalls: {
        startModule: () => null,
        restartModule: () => null,
        shutdownModule: () => null,
    }
}

export default module