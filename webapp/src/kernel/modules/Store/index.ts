import { IModule, KernelCalls } from "../base";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useStoreManager from "./hooks/useStoreManager";
import { useAppDispatch, useAppSelector } from "./hooks";
import useComponentRegistryManager from "./hooks/useComponentRegistryManager";
import useDB from "./hooks/useDB";
import useCurrentWorkspace from "./hooks/useCurrentWorkspace";
import useCollection from './hooks/useCollection';


export interface Store extends IModule {
    name: typeof MODULE_NAME,
    version: typeof MODULE_VERSION,
    hooks: {
        useAppDispatch: typeof useAppDispatch,
        useAppSelector: typeof useAppSelector,
        useDB: typeof useDB,
        useCollection: typeof useCollection,
        useCurrentWorkspace: typeof useCurrentWorkspace
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
        useDB,
        useCollection,
        useCurrentWorkspace
    },
    kernelCalls: {
        startModule: () => undefined,
        restartModule: () => undefined,
        shutdownModule: () => undefined,
    }
}

export default module