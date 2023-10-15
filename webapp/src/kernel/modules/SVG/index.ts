import { IModule } from "../base";
import D3Grid from "./components/d3/Grid";
import SVGViewer from "./components/SVGViewer";
import { MODULE_NAME, MODULE_VERSION } from "./constants";
import useD3Container from "./hooks/useD3Container";
import useSVG from "./hooks/useSVG";
import useSVGManager from "./hooks/useSVGManager";
import { startModule } from "./kernelCalls";

export interface ISVGModule extends IModule {
  name: typeof MODULE_NAME;
  version: typeof MODULE_VERSION;
  components: {
    SVGViewer: typeof SVGViewer;
  };
  d3Components: {
    Grid: typeof D3Grid;
  };
  hooks: {
    useD3Container: typeof useD3Container;
    useSVGManager: typeof useSVGManager;
    useSVG: typeof useSVG;
  };
}

/**
 * Graph module is a kernel component
 * that manages graphs for the application.
 * Kernel uses it for things such:
 * modules tree,
 * ui state management,
 * etc.
 */
const module: ISVGModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: [],
  components: {
    SVGViewer,
  },
  d3Components: { Grid: D3Grid },
  hooks: {
    useD3Container,
    useSVGManager,
    useSVG,
  },
  kernelCalls: {
    startModule,
    restartModule() {},
    shutdownModule() {},
  },
};

export default module;
