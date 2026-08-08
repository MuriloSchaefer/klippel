import React, {  useContext } from "react"
import _ from "lodash"

import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"

import {ViewportType} from '../components/ViewportManager/ViewportTypeProvider'
import { addToGroup, addViewport, closeViewport, removeFromGroup, renameViewport, selectViewport, setExtrasViewport, setViewportHasChanged } from "../store/viewports/actions"
import { VIEWPORT_TYPE_REGISTRY_NAME } from "../constants"
import { createGroup, deleteGroup } from "../store/viewports/groups/actions"


export interface ViewportManager extends Manager {
    functions: {
        registerViewportTypes(components: {[name: string]: ViewportType}): void;
        getViewportTypeComponent(name: string): React.ComponentType<ViewportType>;
        addViewport(title: string, type: string, group?: string, namePrefix?: string, extra?: any):string;
        selectViewport(name: string):void;
        closeViewport(name: string):void;
        renameViewport(oldName: string, newName: string): void;
        setExtras(name: string, extras: any): void
        setHasChanged(name: string, hasChanged: boolean): void;

        createGroup(name: string, color: string, label?: string): void;
        addToGroup(viewportName: string, groupName: string): void;
        removeFromGroup(viewportName: string): void;
        /**
         * Drops the group itself. Deliberately does *not* clear `group` on its
         * member viewports — callers sequence `removeFromGroup` per member
         * first, so the two stay orthogonal.
         */
        deleteGroup(name: string): void;
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
            addViewport(title, type, group, namePrefix="viewport", extra={}){
                const comp = componentRegistryManager.functions.getComponent(VIEWPORT_TYPE_REGISTRY_NAME, type)
                if (!comp) throw Error('Unknown viewport type')
                
                const name = _.uniqueId(namePrefix);

                dispatch(addViewport({name, title, type, group, extra}))
                return name
            },
            renameViewport(oldName, newName){
                dispatch(renameViewport({oldName, newName}))
            },
            setExtras(name, extras){               
                dispatch(setExtrasViewport({name, extras}))
            },
            selectViewport(name){
                dispatch(selectViewport({name}))
            },
            closeViewport(name){
                dispatch(closeViewport({name}))
            },


            createGroup(name, color, label){
                dispatch(createGroup({name, color, label}))
            },
            addToGroup(viewportName, groupName){
                dispatch(addToGroup({viewportName, groupName}))
            },
            removeFromGroup(viewportName){
                dispatch(removeFromGroup({viewportName}))
            },
            deleteGroup(name){
                dispatch(deleteGroup({name}))
            },
            setHasChanged(name, hasChanged){
                dispatch(setViewportHasChanged({name, hasChanged}))
            }
        }
    }
}

export default useViewportManager