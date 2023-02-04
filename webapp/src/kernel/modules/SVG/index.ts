import { IModule } from "../base";
import SVGViewer from "./components/SVGViewer";
import {MODULE_NAME, MODULE_VERSION} from "./constants"
import useSVGManager from "./hooks/useSVGManager";
import { startModule } from "./kernelCalls";

export interface ISVGModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  components: {
    SVGViewer: typeof SVGViewer
  },
  hooks: {
    useSVGManager: typeof useSVGManager
  },  
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
    SVGViewer
  },
  hooks: {
    useSVGManager
  },
  kernelCalls: {
    startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default module;
