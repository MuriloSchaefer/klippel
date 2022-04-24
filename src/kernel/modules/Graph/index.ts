import { IModule } from "../base";
import useGraph from "../../hooks/useGraph";

import reducer, {
  addNode,
  removeNode,
  addEdge,
  removeEdge,
} from "./store/graphSlice";

export interface IGraphModule extends IModule {
  actions: {
    addNode: typeof addNode;
    removeNode: typeof removeNode;
    addEdge: typeof addEdge;
    removeEdge: typeof removeEdge;
  };
  hooks: {
    useGraph: () => ReturnType<typeof useGraph>;
  };
}

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const GraphModule: IGraphModule = {
  name: "graph",
  components: {},
  reducers: { graph: reducer },
  actions: { addNode, removeNode, addEdge, removeEdge },
  hooks: { useGraph },
};

export default GraphModule;
