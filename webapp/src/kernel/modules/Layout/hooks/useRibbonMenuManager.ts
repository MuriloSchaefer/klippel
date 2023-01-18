import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"
import React, { useContext } from "react"
import { SectionsContext } from "../components/RibbonMenu/SectionsProvider"
import { selectActiveTab, selectTabs } from "../store/selectors"
import { RibbonTab } from "../store/state"


export interface RibbonMenuManager extends Manager {
    functions: {
        tabExists: (tabName: string) => boolean
        addNewTab: (tab: RibbonTab) => void
        addSectionToTab: (tabName: string, section: React.ReactNode) => void
        removeTab: (tabName: string) => void
        removeSection: (tabName: string) => void
        selectTab: (tabName: string) => void
    }
}

export function useRibbonMenuManager():RibbonMenuManager{

    const storeModule = useModule<Store>("Store");
    const { useAppSelector } = storeModule.hooks;
    
    const tabs = useAppSelector(selectTabs);
    const activeTab = useAppSelector(selectActiveTab);
    const {sections, setSections} = useContext(SectionsContext)
    
    return {
        functions: {
            tabExists(tabName){
               return tabs != undefined && tabName in tabs 
            },
            addNewTab(tab){

            }
        }
    } as RibbonMenuManager
}

export default useRibbonMenuManager