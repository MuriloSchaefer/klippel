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
import { GraphsManagerState } from "./store/state";

import useGraph from "./hooks/useGraph";

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
  hooks: {
    useGraph: typeof useGraph;
  };
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const GraphModule: IGraphModule = {
  name: "GraphModule",
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
    middlewares: [],
    reducers: { graphsManager: reducer },
    selectors: { selectGraphById },
  },
  hooks: {
    useGraph,
  },
};

export default GraphModule;
