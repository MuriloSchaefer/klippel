import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Reducer } from "react";
import { IModule } from "../base";

// eslint-disable-next-line import/no-cycle
// import reducer, {
//   newGraph,
//   removeGraph,
//   addNode,
//   removeNode,
//   updateNode,
//   addEdge,
//   removeEdge,
//   selectGraphById,
// } from "./store/graphsManagerSlice";
import { GraphsManagerState } from "./store/state";

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
}
  // store: {
  //   actions: {
  //     newGraph: typeof newGraph;
  //     removeGraph: typeof removeGraph;
  //     addNode: typeof addNode;
  //     removeNode: typeof removeNode;
  //     updateNode: typeof updateNode;
  //     addEdge: typeof addEdge;
  //     removeEdge: typeof removeEdge;
  //   };
  //   middlewares: ListenerMiddlewareInstance[];
  //   reducers: {
  //     graphsManager: Reducer<GraphsManagerState, AnyAction>;
  //   };
  //   selectors: {
  //     selectGraphById: typeof selectGraphById;
  //   };
  // };
  // hooks: {
  //   module: {
  //     useGraph: typeof useGraph;
  //   }
  // };
//}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const GraphModule: IGraphModule = {
  name: MODULE_NAME,
  version: MODULE_VERSION,
  depends_on: ['Store'],
  managers: {
    graphs: useGraphsManager
  },
  kernelCalls: {
    startModule: startModule,
    restartModule(){},
    shutdownModule(){}
  }
}
//   components: {},
//   store: {
//     actions: {
//       newGraph,
//       removeGraph,
//       addNode,
//       removeNode,
//       updateNode,
//       addEdge,
//       removeEdge,
//     },
//     middlewares: [],
//     reducers: { graphsManager: reducer },
//     selectors: { selectGraphById },
//   },
//   hooks: {
//     module: {
//       useGraph,
//     }
//   },
// };

export default GraphModule;
