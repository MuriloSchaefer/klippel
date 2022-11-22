import useGraph from "@kernel/modules/GraphsModule/hooks/useGraph";
import useComposerUIState from "modules/Composer/hooks/useComposerUIState";
import { CompositionGraphState } from "modules/Composer/store/state";
import React from "react";
import Proxy from "./proxy";

interface ProxiesProps {
    viewportId: string;
}

const Proxies = ({viewportId}: ProxiesProps) => {

    const composerUI = useComposerUIState(ui => ui.viewports[viewportId])

    const proxySelector = (g: CompositionGraphState | undefined) => g ? Object.values(g.nodes).filter(n => n.properties?.Tipo?.value).map(n => n.id) : []
    const {state: nodes} = useGraph<CompositionGraphState, string[]>(composerUI.graphId, proxySelector)
    if (!nodes) return null

    return <div role="proxies" id={`${viewportId}-proxies`}>
        {nodes.map((n: string) => <Proxy viewportId={viewportId} nodeId={n} key={`${viewportId}-${n}`}/>)}
    </div>
}

export default React.memo(Proxies);