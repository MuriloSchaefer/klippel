import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"
import { ComponentRegistryContext, ComponentTypeMap } from "@kernel/modules/Store/contexts/componentRegistry"
import _ from "lodash"
import React, { useContext } from "react"
import { SectionsContext } from "../components/RibbonMenu/SectionsProvider"
import { SECTIONS_REGISTRY_NAME } from "../constants"
import { addRibbonTab, selectTab } from "../store/ribbonMenu/actions"
import { selectActiveTab, selectTabs } from "../store/ribbonMenu/selectors"
import { RibbonTab, RibbonTabState } from "../store/ribbonMenu/state"

interface AddTabProps {
    label: string
    type: "dropdown" | "base"
    sections: ComponentTypeMap
}
export interface RibbonMenuManager extends Manager {
    functions: {
        tabExists: (tabName: string) => boolean
        addNewTab: (tab: AddTabProps) => void
        addSectionToTab: (tabName: string, section: React.ReactNode) => void
        removeTab: (tabName: string) => void
        removeSection: (tabName: string) => void
        selectTab: (tabName: string) => void
    }
}

export function useRibbonMenuManager():RibbonMenuManager{

    const storeModule = useModule<Store>("Store");
    const { useAppSelector, useAppDispatch } = storeModule.hooks;
    const { componentRegistry } = storeModule.managers;
    const dispatch = useAppDispatch()
    
    const tabs = useAppSelector(selectTabs);
    // const activeTab = useAppSelector(selectActiveTab);
    const {sections, setSections} = useContext(SectionsContext)
    console.log(sections)

    const componentRegistryManager = componentRegistry()
    
    return {
        functions: {
            tabExists(tabName){
               return tabs != undefined && tabName in tabs 
            },
            addNewTab(tab){
                // TODO: ADD Checks


                const name = _.uniqueId('tab-')
                const newTab = {
                    ...tab,
                    name,
                    active: false
                } as RibbonTabState

                const sections = Object.entries(tab.sections).reduce((components, [name, comp], idx) =>{
                    return {...components, [`${name}-${idx}`]: comp}
                }, {})
                componentRegistryManager.functions.registerComponents(SECTIONS_REGISTRY_NAME, sections)
                newTab.sectionNames = Object.keys(sections)
                delete newTab.sections
                dispatch(addRibbonTab({tab: newTab}))


            },
            selectTab(name){
                dispatch(selectTab({name}))
            }
        }
    } as RibbonMenuManager
}

export default useRibbonMenuManager