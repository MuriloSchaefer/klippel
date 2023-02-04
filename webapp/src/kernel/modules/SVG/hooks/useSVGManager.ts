import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base"
import { Store } from "@kernel/modules/Store";
import { loadSVG } from "../store/actions";

interface SVGManager extends Manager {
    functions: {
        loadSVG(path: string):void
    }
}

export const useSVGManager = (): SVGManager => {

    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()


    return {
        functions: {
            loadSVG(path){
                dispatch(loadSVG({path}))
            }
        }
    }
}


export default useSVGManager