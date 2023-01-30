import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base";
import { ILayoutModule } from "@kernel/modules/Layout";


interface CompositionsManager extends Manager {
    functions: {
        newComposition(compositionName: string, modelPath: string): void;
    }
}

export const useCompositionsManager = (): CompositionsManager => {

    // const storeModule = useModule<Store>("Store");
    // const { useAppDispatch } = storeModule.hooks;
    // const dispatch = useAppDispatch()
    const layoutModule = useModule<ILayoutModule>('Layout')
    const viewportManager = layoutModule.hooks.useViewportManager()

    return {
        functions: {
            newComposition(compositionName, modelPath){
                // dispatch
                viewportManager.functions.addViewport(compositionName, 'Composer', undefined, 'composition-')
            }
        }
    }
} 

export default useCompositionsManager;