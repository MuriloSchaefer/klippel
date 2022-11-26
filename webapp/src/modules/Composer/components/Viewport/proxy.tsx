import useModule from "@kernel/hooks/useModule";
import useGraph from "@kernel/modules/GraphsModule/hooks/useGraph";
import { ISVGModule } from "@kernel/modules/SVGModule";
import useSVGSelector from "@kernel/modules/SVGModule/hooks/useSVGSelector";
import { useAppSelector } from "@kernel/store/hooks";
import useComposerUIState from "modules/Composer/hooks/useComposerUIState";
import Composition from "modules/Composer/interfaces/Composition";
import Material from "modules/Composer/interfaces/Material";
import { CompositionGraphState } from "modules/Composer/store/state";
import React, { useEffect } from "react";

interface ProxyProps {
    viewportId: string;
    nodeId: string;
}
const Proxy = ({viewportId, nodeId}: ProxyProps) => {

    const composerUI = useComposerUIState(ui => ui.viewports[viewportId])

    const SVGModule = useModule<ISVGModule>("SVGModule")
    const SVGManager = SVGModule.hooks.module.useSVGManager()

    const proxySelector = (g: CompositionGraphState | undefined) => g && g.nodes[nodeId]
    const {state: node} = useGraph<CompositionGraphState, Composition | Material | undefined>(composerUI.graphId, proxySelector)
    useEffect(()=>{
        if (!node) return 
        SVGManager.methods.syncProxy(composerUI.svgPath, {id:node.id, fill: node.properties?.Cor?.value ?? "ffffff"})
    }, [node])


    if (!node) return null
    return <div role="svg-proxy" id={`${viewportId}-${nodeId}`} ></div>
}

export default React.memo(Proxy);