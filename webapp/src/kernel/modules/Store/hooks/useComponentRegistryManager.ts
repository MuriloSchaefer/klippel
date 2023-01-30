import { Manager } from "@kernel/modules/base";
import { AnyAction } from "redux";
import { ComponentType, useContext } from "react";
import {ComponentRegistries, ComponentRegistryContext} from "../contexts/componentRegistry";

export type AppAction = AnyAction

export interface ComponentRegistryManager extends Manager {
    functions: {
        createRegistry: (name: string) => void,
        createRegistries: (registries: ComponentRegistries)=> void
        registerComponents: <T=any>(components: {[registry:string]: {[name: string]: ComponentType<T>}}) => void,
        getComponent: <T=any>(registryName: string, componentName: string)=> ComponentType<T>
    }
}

/**
 * ComponentRegistry Manager is the responsible for maintaining component reference
 */
export const useComponentRegistryManager = (): ComponentRegistryManager => {

    const { createRegistry, createRegistries, getComponent, registerComponents } = useContext(ComponentRegistryContext)

    const manager: ComponentRegistryManager = {
        functions: {
            createRegistry,
            createRegistries,
            registerComponents,
            getComponent,
        }
    }
    return manager
}

export default useComponentRegistryManager