import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { ISVGModule } from "@kernel/modules/SVG";
import { createComposition } from "../store/actions";


interface CompositionsManager extends Manager {
    functions: {
        createComposition(compositionName: string, modelPath: string): void;
    }
}

export const useCompositionsManager = (): CompositionsManager => {

    const storeModule = useModule<Store>("Store");
    const layoutModule = useModule<ILayoutModule>('Layout')
    const svgModule = useModule<ISVGModule>("SVG");

    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()

    const viewportManager = layoutModule.hooks.useViewportManager()
    const svgManager = svgModule.hooks.useSVGManager()

    return {
        functions: {
            createComposition(name, modelPath){
                // dispatch
                viewportManager.functions.addViewport(name, 'Composer', undefined, 'composition-')
                
                const path = `catalog/${modelPath}`
                dispatch(createComposition({name: name, svgPath: path}))
                svgManager.functions.loadSVG(path)
            }
        }
    }
} 

export default useCompositionsManager;