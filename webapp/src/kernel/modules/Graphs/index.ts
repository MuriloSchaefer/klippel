import { IModule } from "../base";

import useGraph from "./hooks/useGraph";

import {MODULE_NAME, MODULE_VERSION} from "./constants"
import { startModule } from "./kernelCalls";
import useGraphsManager from "./hooks/useGraphsManager";
import { getGraphState } from "./store/graphsManager/selectors";
import useNodeInfo from "./hooks/useNodeInfo";
import useSearchResult from "./hooks/useSearchResult";

export interface IGraphModule extends IModule {
  name: typeof MODULE_NAME,
  version: typeof MODULE_VERSION,
  managers: {
    graphs: typeof useGraphsManager
  },
  hooks: {
    useGraph: typeof useGraph,
    useNodeInfo: typeof useNodeInfo,
    useSearchResult: typeof useSearchResult
  }
  store: {
    selectors: {
      getGraphState: typeof getGraphState
    }
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
    useGraph,
    useNodeInfo,
    useSearchResult
  },
  store: {
    selectors: {getGraphState}
  },
  kernelCalls: {
    startModule: startModule,
    restartModule(){},
    shutdownModule(){}
  }
}

export default GraphModule;
