import React, {  useContext } from "react"
import _ from "lodash"

import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"

import { ViewportState } from "../store/state"
import {ViewportType, ViewportTypeContext} from '../components/ViewportManager/ViewportTypeProvider'
import { addViewport, closeViewport, renameViewport, selectViewport } from "../store/viewports/actions"
import { PaletteColor } from "@mui/material"


export interface ViewportManager extends Manager {
    functions: {
        registerViewportType(name: string, component: ViewportType): void;
        getViewportTypeComponent(name: string): ViewportType;
        addViewport(title: string, type: string, group?: string, namePrefix?: string):ViewportState;
        selectViewport(name: string):void;
        closeViewport(name: string):void;
        renameViewport(oldName: string, newName: string): void;

        createGroup(name: string, color: PaletteColor): void;
        addToGroup(viewportName: string, groupName: string): void;
        removeFromGroup(viewportName: string): void;
        deleteGroup(name: string): void;
    }
}

export function useViewportManager():ViewportManager{

    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()

    const {types, addType} = useContext(ViewportTypeContext)
    
    return {
        functions: {
            registerViewportType(name, component){
                if ((name in types)) throw Error('viewport type already exists')
                addType(name, component)
            },
            getViewportTypeComponent(name){
                if (!(name in types)) throw Error('Unknown viewport type')
                return types[name]
            },
            addViewport(title, type, group, namePrefix="viewport"){
                if (!(type in types)) throw Error('Unknown viewport type')
                
                const name = _.uniqueId(namePrefix);

                dispatch(addViewport({name, title, type, group}))
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


        }
    } as ViewportManager
}

export default useViewportManager