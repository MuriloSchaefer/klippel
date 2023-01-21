import { useContext, useMemo, useState } from "react";

import { IModule, Manager } from "@kernel/modules/base";
import storeModule from "@kernel/modules/Store";
import layoutModule from "@kernel/modules/Layout";

import ModulesContext from "../context";
import {ModuleAlreadyLoaded, ModuleNotLoaded} from "../exceptions";
import { moduleStarted, startModule } from "../store/actions";
import { modulesCount as modulesCountSelector } from "../store/selectors";

export interface ModulesManager extends Manager {
    modulesLoaded: number,
    functions: {
        isModuleLoaded: (moduleName: string) => boolean
        loadModule: (module: IModule) => void,
        unloadModule: (moduleName: string) => void,
        reloadModule: (moduleName: string) => void
    }
}

/**
 * Modules Manager is the responsible for manipulating modules
 * i.e. loading, unloading, or restarting a module
 */
export const useModulesManager = (): ModulesManager => {
    const {modules, setModules} = useContext(ModulesContext)

    const storeManager = storeModule.managers.store()
    const dispatch = storeModule.hooks.useAppDispatch()
    const useAppSelector = storeModule.hooks.useAppSelector

    // managers propagated to the start module method
    const {useLayoutManager, useViewportManager, useRibbonMenuManager} = layoutModule.hooks

    const modulesCount = useAppSelector(modulesCountSelector)

    const manager: ModulesManager = {
        modulesLoaded: modulesCount,
        functions: {
            isModuleLoaded: (moduleName: string) => moduleName in modules,
            loadModule(module){
                
                if (module.name in modules) throw new ModuleAlreadyLoaded(`${module.name} is not registered. Consider using restartModule instead.`)
                setModules({...modules, [module.name]: module})

                dispatch(startModule(module.name))
                
                module.kernelCalls.startModule(storeManager)

                // emit event
                dispatch(moduleStarted(module.name))

            },
            unloadModule(moduleName){
                if (!(moduleName in modules)) throw new ModuleNotLoaded(`${moduleName} is not registered.`)
                const module = modules[moduleName]

                module.kernelCalls.shutdownModule(storeManager)
                delete modules[moduleName]
                setModules(modules)
            },
            reloadModule(moduleName){
                if (!(moduleName in modules)) throw new ModuleNotLoaded(`${moduleName} is not registered.`)
                const module = modules[moduleName]
                setModules(modules)

                module.kernelCalls.restartModule(storeManager)
            }
        }
    }
    return manager
}

export default useModulesManager