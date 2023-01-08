import { IModule } from "../base";

import useGraph from "./hooks/useGraph";

import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule } from "./kernelCalls";
import useGraphsManager from "./hooks/useGraphsManager";

export interface IGraphModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  managers: {
    graphs: typeof useGraphsManager
  },
  hooks: {
    useGraph: typeof useGraph
  }
}

/**
 * Graph module is a kernel component
 * that manages graphs for the application.
 * Kernel uses it for things such:
 * modules tree,
 * ui state management,
 * etc.
 */
const GraphModule: IGraphModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Store'],
  managers: {
    graphs: useGraphsManager
  },
  hooks: {
    useGraph
  },
  kernelCalls: {
    startModule: startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default GraphModule;
