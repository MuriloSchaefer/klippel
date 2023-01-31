import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"
import { closeDetails, collapseSettings, expandSettings, openDetails } from "../store/panels/actions"


export interface PanelsManager extends Manager {
    functions: {
        expandSettings(): void
        collapseSettings(): void
        openDetails(): void
        closeDetails(): void
    }
}

export function usePanelsManager():PanelsManager{

    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()
    
    return {
        functions: {
            expandSettings(){
                dispatch(expandSettings())
            },
            collapseSettings(){
                dispatch(collapseSettings())
            },
            openDetails(){
                dispatch(openDetails())
            },
            closeDetails(){
                dispatch(closeDetails())
            },
        }
    }
}

export default usePanelsManager