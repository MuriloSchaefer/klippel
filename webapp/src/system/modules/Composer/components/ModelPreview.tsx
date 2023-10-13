import { useLayoutEffect } from "react";

import useModule from "@kernel/hooks/useModule";
import type { ISVGModule } from "@kernel/modules/SVG";
import type { SVGViewerProps } from "@kernel/modules/SVG/components/SVGViewer";

type ModelPreviewProps = SVGViewerProps & {
    instanceName: string
    path: string
}

export default ({instanceName, path, ...props}: ModelPreviewProps) => {

    const SVGModule = useModule<ISVGModule>("SVG");

    const {
        components: {SVGViewer},
      hooks: { useSVGManager },
    } = SVGModule;
    const svgManager = useSVGManager();
    
    useLayoutEffect(()=>{
        svgManager.functions.loadSVG(path, `${instanceName}-preview`)
    }, [])

    return <SVGViewer {...props} instanceName={`${instanceName}-preview`} path={path} />
}