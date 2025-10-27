import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { ILayoutModule } from "@kernel/modules/Layout";
import { ISVGModule } from "@kernel/modules/SVG";
import { useTheme } from "@mui/material";



export default function SVGView({ variationId }: { variationId: string }){
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

    return <>Graph View</>
}



