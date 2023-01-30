import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { newComposition } from "../store/actions";


interface CompositionsManager extends Manager {
    functions: {
        newComposition(compositionName: string, modelPath: string): void;
    }
}

export const useCompositionsManager = (): CompositionsManager => {

    const storeModule = useModule<Store>("Store");
    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()

    const layoutModule = useModule<ILayoutModule>('Layout')
    const viewportManager = layoutModule.hooks.useViewportManager()

    return {
        functions: {
            newComposition(name, modelPath){
                // dispatch
                viewportManager.functions.addViewport(name, 'Composer', undefined, 'composition-')
                dispatch(newComposition({name: name, svgPath: modelPath}))
            }
        }
    }
} 

export default useCompositionsManager;