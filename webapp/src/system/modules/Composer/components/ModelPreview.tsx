import { useLayoutEffect } from "react";
import Box, { BoxProps }  from "@mui/material/Box";

import useModule from "@kernel/hooks/useModule";
import type { ISVGModule } from "@kernel/modules/SVG";

type ModelPreviewProps = BoxProps & {
    instanceName: string
    path: string
}

export default ({instanceName, path}: ModelPreviewProps) => {

    const SVGModule = useModule<ISVGModule>("SVG");

    const {
      hooks: { useSVGManager, useSVG },
    } = SVGModule;
    const svgManager = useSVGManager();
    const _state = useSVG(path, instanceName)
    
    useLayoutEffect(()=>{
        svgManager.functions.loadSVG(path, `${instanceName}-preview`)
    }, [])

    return <Box>Preview</Box>
}