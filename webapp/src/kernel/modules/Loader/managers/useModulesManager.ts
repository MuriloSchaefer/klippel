import { useContext, useMemo, useState } from "react";

import { IModule, Manager } from "@kernel/modules/base";
import storeModule from "@kernel/modules/Store";

import ModulesContext from "../context";
import {ModuleAlreadyLoaded, ModuleNotLoaded} from "../exceptions";
import { moduleStarted, startModule } from "../store/actions";
import { modulesCount as modulesCountSelector } from "../store/selectors";

export interface ModulesManager extends Manager {
    modulesLoaded: number,
    functions: {
        isModuleLoaded: (moduleName: string) => boolean
        loadModule: (module: IModule) => void,
        unloadModule: (moduleName: string) => void
        reloadModule: (moduleName: string) => void
    }
}

/**
 * Modules Manager is the responsible for manipulating modules
 * i.e. loading, unloading, or restarting a module
 */
export const useModulesManager = (): ModulesManager => {
    const dispatch = storeModule.hooks.useAppDispatch()
    
    const storeManager = storeModule.managers.store()
    const useAppSelector = storeModule.hooks.useAppSelector
    
    const modules = useContext(ModulesContext)
    const modulesCount = useAppSelector(modulesCountSelector)

    const manager: ModulesManager = {
        modulesLoaded: modulesCount,
        functions: {
            isModuleLoaded: (moduleName: string) => moduleName in modules,
            loadModule(module){
                dispatch(startModule(module.name))
                
                if (module.name in modules) throw new ModuleAlreadyLoaded(`${module.name} is not registered. Consider using restartModule instead.`)
                modules[module.name] = module

                module.kernelCalls.startModule(storeManager)

                // emit event
                dispatch(moduleStarted(module.name))

            },
            unloadModule(moduleName){
                console.log('unloading module: ', moduleName)
                if (!(moduleName in modules)) throw new ModuleNotLoaded(`${moduleName} is not registered.`)
                const module = modules[moduleName]

                module.kernelCalls.shutdownModule(storeManager)
                delete modules[moduleName]
            },
            reloadModule(moduleName){
                console.log('reloading module: ', moduleName)
                if (!(moduleName in modules)) throw new ModuleNotLoaded(`${moduleName} is not registered.`)
                const module = modules[moduleName]

                module.kernelCalls.restartModule(storeManager)
            }
        }
    }
    return manager
}

export default useModulesManager