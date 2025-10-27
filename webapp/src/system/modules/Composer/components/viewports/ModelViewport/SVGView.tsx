

import type { ISVGModule } from "@kernel/modules/SVG";
import useModule from "@kernel/hooks/useModule";
import useVariation from "../../../hooks/useVariation";
import { ILayoutModule } from "@kernel/modules/Layout";
import { IGraphModule } from "@kernel/modules/Graphs";
import { useTheme } from "@mui/material";


export function SVGModelViewport({variationId}: {variationId: string}) {
    const theme = useTheme();
    const {
        hooks: { useGraph },
    } = useModule<IGraphModule>("Graph");
    const {
        hooks: { useResizeObserver },
    } = useModule<ILayoutModule>("Layout");
    const {
        hooks: { useD3Container },
        d3Components: { Grid, DependencyCircle },
    } = useModule<ISVGModule>("SVG");

    return <>SVG Model Viewport</>
}

export default function SVGView({variationId}: {variationId: string}){
    const variation = useVariation({ variationId });
    if (!variation.state.svg) {
        return <>no SVG View</>
    }

    return <SVGModelViewport variationId={variationId} />
}