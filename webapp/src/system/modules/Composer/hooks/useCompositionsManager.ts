import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { ISVGModule } from "@kernel/modules/SVG";
import _ from "lodash";
import { createComposition } from "../store/actions";


interface CompositionsManager extends Manager {
    functions: {
        createComposition(compositionName: string, modelPath: string): void;
    }
}

export const useCompositionsManager = (): CompositionsManager => {

    const storeModule = useModule<Store>("Store");
    const graphModule = useModule<IGraphModule>("Graph");
    const layoutModule = useModule<ILayoutModule>('Layout')
    const svgModule = useModule<ISVGModule>("SVG");

    const { useAppDispatch } = storeModule.hooks;
    const dispatch = useAppDispatch()

    const viewportManager = layoutModule.hooks.useViewportManager()
    const svgManager = svgModule.hooks.useSVGManager()
    const graphManager = graphModule.managers.graphs()

    return {
        functions: {
            createComposition(title, modelPath){
                // dispatch
                const vpName = viewportManager.functions.addViewport(title, 'Composer', undefined, 'composition-')
                
                const path = `catalog/${modelPath}`
                graphManager.functions.createGraph(vpName)
                dispatch(createComposition({name: vpName, viewportName: vpName, svgPath: path, graphId: vpName}))
                svgManager.functions.loadSVG(path, vpName)
            }
        }
    }
} 

export default useCompositionsManager;