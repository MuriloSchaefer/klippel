import useModule from "@kernel/hooks/useModule"
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store"
import { PaletteMode } from "@mui/material"
import { switchTheme } from "../store/actions"


export interface LayoutManager extends Manager {
    functions: {
        setTheme(theme: PaletteMode):void;
    }
}

export function useLayoutManager():LayoutManager{

    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()
    
    return {
        functions: {
            setTheme(theme){
                dispatch(switchTheme({ theme}));
            }
        }
    } as LayoutManager
}

export default useLayoutManager