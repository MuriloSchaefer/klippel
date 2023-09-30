import React, {  useContext } from "react"
import _ from "lodash"

import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"

import {ViewportType} from '../components/ViewportManager/ViewportTypeProvider'
import { addToGroup, addViewport, closeViewport, renameViewport, selectViewport } from "../store/viewports/actions"
import { VIEWPORT_TYPE_REGISTRY_NAME } from "../constants"
import { createGroup } from "../store/viewports/groups/actions"


export interface ViewportManager extends Manager {
    functions: {
        registerViewportTypes(components: {[name: string]: ViewportType}): void;
        getViewportTypeComponent(name: string): React.ComponentType<ViewportType>;
        addViewport(title: string, type: string, group?: string, namePrefix?: string):string;
        selectViewport(name: string):void;
        closeViewport(name: string):void;
        renameViewport(oldName: string, newName: string): void;

        createGroup(name: string, color: string): void;
        addToGroup(viewportName: string, groupName: string): void;
        // removeFromGroup(viewportName: string): void;
        // deleteGroup(name: string): void;
    }
}

export function useViewportManager():ViewportManager{

    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const {componentRegistry} = storeModule.managers;
    const dispatch = useAppDispatch()

    const componentRegistryManager = componentRegistry()
    
    return {
        functions: {
            registerViewportTypes(components){
                // if ((name in types)) throw Error('viewport type already exists')
                componentRegistryManager.functions.registerComponents({[VIEWPORT_TYPE_REGISTRY_NAME]: components})
            },
            getViewportTypeComponent(name){
                const comp = componentRegistryManager.functions.getComponent(VIEWPORT_TYPE_REGISTRY_NAME, name)
                if (!comp) throw Error('Unknown viewport type')
                return comp
            },
            addViewport(title, type, group, namePrefix="viewport"){
                const comp = componentRegistryManager.functions.getComponent(VIEWPORT_TYPE_REGISTRY_NAME, type)
                if (!comp) throw Error('Unknown viewport type')
                
                const name = _.uniqueId(namePrefix);

                dispatch(addViewport({name, title, type, group}))
                return name
            },
            renameViewport(oldName, newName){
                dispatch(renameViewport({oldName, newName}))
            },
            selectViewport(name){
                dispatch(selectViewport({name}))
            },
            closeViewport(name){
                dispatch(closeViewport({name}))
            },


            createGroup(viewportName, color){
                dispatch(createGroup({name: viewportName, color}))
            },
            addToGroup(viewportName, groupName){
                dispatch(addToGroup({viewportName, groupName}))
            }
        }
    }
}

export default useViewportManager