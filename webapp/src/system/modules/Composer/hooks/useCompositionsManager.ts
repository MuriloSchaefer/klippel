import useModule from "@kernel/hooks/useModule";
import { Manager } from "@kernel/modules/base";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { Store } from "@kernel/modules/Store";
import { ISVGModule } from "@kernel/modules/SVG";
import _ from "lodash";
import { createComposition } from "../store/actions";
import { openDebugView } from "../store/composition/actions";
import { CompositionState } from "../store/composition/state";
import { selectComposerModule } from "../store/selectors";


interface CompositionsManager extends Manager {
    functions: {
        createComposition(compositionName: string, modelPath: string): void;
        createDebugView(compositionName:string, viewportName: string): void;
        findComposition(filter: (composition: CompositionState)=>boolean): CompositionState | undefined
    }
}

export const useCompositionsManager = (): CompositionsManager => {

    const storeModule = useModule<Store>("Store");
    const graphModule = useModule<IGraphModule>("Graph");
    const layoutModule = useModule<ILayoutModule>('Layout')
    const svgModule = useModule<ISVGModule>("SVG");

    const { useAppDispatch, useAppSelector } = storeModule.hooks;
    const dispatch = useAppDispatch()

    const viewportManager = layoutModule.hooks.useViewportManager()
    const svgManager = svgModule.hooks.useSVGManager()
    const graphManager = graphModule.managers.graphs()

    const {compositionsManager: _state} = useAppSelector(selectComposerModule)

    return {
        functions: {
            createComposition(title, modelPath){
                // dispatch
                const vpName = viewportManager.functions.addViewport(title, 'Composer', undefined, 'composition-')
                
                const path = `catalog/${modelPath}`
                graphManager.functions.createGraph(vpName)
                dispatch(createComposition({name: vpName, viewportName: vpName, svgPath: path, graphId: vpName}))
                svgManager.functions.loadSVG(path, vpName)
            },
            createDebugView(compositionName, viewportName){
                const groupName = `debug-${compositionName}`
                viewportManager.functions.createGroup(groupName,  'blue')
                viewportManager.functions.addToGroup(viewportName, groupName)
                const debugVpName = viewportManager.functions.addViewport("Debug", "DebuggerViewport", groupName, "debug-")
                
                dispatch(openDebugView({compositionName, debugViewport: debugVpName}))
                viewportManager.functions.selectViewport(debugVpName)
            },
            findComposition(filter){
                return Object.values(_state.compositions).find(filter)
            }
        }
    }
} 

export default useCompositionsManager;