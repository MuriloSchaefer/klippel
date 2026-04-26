import { Manager } from "@kernel/modules/base";
import { AnyAction } from "redux";
import { ComponentType, useContext, useMemo } from "react";
import {ComponentRegistries, ComponentRegistryContext, ComponentTypeMap} from "../contexts/componentRegistry";

export type AppAction = AnyAction

export interface ComponentRegistryManager extends Manager {
    functions: {
        createRegistry: (name: string) => void,
        createRegistries: (registries: ComponentRegistries)=> void
        registerComponents: <T=any>(components: {[registry:string]: {[name: string]: ComponentType<T>}}) => void,
        getComponent: <T=any>(registryName: string, componentName: string)=> ComponentType<T>
        getRegistry: <T=any>(registryName: string)=> ComponentTypeMap<T>
    }
}

/**
 * ComponentRegistry Manager is the responsible for maintaining component reference
 */
export const useComponentRegistryManager = (): ComponentRegistryManager => {

    const { createRegistry, createRegistries, getComponent, getRegistry, registerComponents } = useContext(ComponentRegistryContext)

    const manager: ComponentRegistryManager = useMemo(() => ({
        functions: {
            createRegistry,
            createRegistries,
            registerComponents,
            getComponent,
            getRegistry,
        }
    }), [createRegistry, createRegistries, registerComponents, getComponent, getRegistry])
    return manager
}

export default useComponentRegistryManager