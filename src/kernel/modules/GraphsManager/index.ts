import { AnyAction, ListenerMiddlewareInstance } from "@reduxjs/toolkit";
import { Reducer } from "react";
import { IModule } from "../base";

// eslint-disable-next-line import/no-cycle
import reducer, {
  newGraph,
  removeGraph,
  addNode,
  removeNode,
  updateNode,
  addEdge,
  removeEdge,
  selectGraphById,
} from "./store/graphsManagerSlice";
import createGraph from "./store/middlewares/newGraph";
import { GraphsManagerState } from "./store/state";

export interface IGraphModule extends IModule {
  store: {
    actions: {
      newGraph: typeof newGraph;
      removeGraph: typeof removeGraph;
      addNode: typeof addNode;
      removeNode: typeof removeNode;
      updateNode: typeof updateNode;
      addEdge: typeof addEdge;
      removeEdge: typeof removeEdge;
    };
    middlewares: ListenerMiddlewareInstance[];
    reducers: {
      graphsManager: Reducer<GraphsManagerState, AnyAction>;
    };
    selectors: {
      selectGraphById: typeof selectGraphById;
    };
  };
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const GraphModule: IGraphModule = {
  name: "GraphsManager",
  components: {},
  store: {
    actions: {
      newGraph,
      removeGraph,
      addNode,
      removeNode,
      updateNode,
      addEdge,
      removeEdge,
    },
    middlewares: [createGraph],
    reducers: { graphsManager: reducer },
    selectors: { selectGraphById },
  },
  hooks: {},
};

export default GraphModule;
