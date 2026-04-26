import useModule from "@kernel/hooks/useModule"
import { Manager, Shortcut } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"
import _ from "lodash"
import { useContext } from "react"
import { SectionsContext } from "../components/RibbonMenu/SectionsProvider"
import { addRibbonTab, selectTab } from "../store/ribbonMenu/actions"
import { selectTabs } from "../store/ribbonMenu/selectors"
import { RibbonTabState, Tabs } from "../store/ribbonMenu/state"

interface AddTabProps {
    label: string
    type: "dropdown" | "base"
    sectionNames: string[] // component name in the Registry
    shortcuts?: Shortcut[]
}
export interface RibbonMenuManager extends Manager {
    tabs: Tabs | undefined,
    functions: {
        tabExists: (tabName: string) => boolean
        addNewTab: (tab: AddTabProps) => void
        addSectionToTab: (tabName: string, sectionName: string) => void
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

    const componentRegistryManager = componentRegistry()
    
    return {
        tabs,
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

                dispatch(addRibbonTab({tab: newTab}))


            },
            selectTab(name){
                dispatch(selectTab({name}))
            }
        }
    } as RibbonMenuManager
}

export default useRibbonMenuManager