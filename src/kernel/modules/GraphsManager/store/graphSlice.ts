import { PayloadAction } from "@reduxjs/toolkit";

import Node from "../interfaces/Node";
import Edge from "../interfaces/Edge";
import { GraphsManagerState } from "./state";

export default {
  addNode: (
    state: GraphsManagerState,
    action: PayloadAction<{ graphId: string; node: Node }>
  ) => {
    const graph = state.graphs[action.payload.graphId];
    const node = graph.nodes[action.payload.node.id];
    if (node) throw Error("Node already exists");

    graph.nodes[action.payload.node.id] = action.payload.node;

    Object.entries(action.payload.node.inputs).forEach(
      ([sourceId, edge]: [string, Edge]) => {
        const sourceNode = graph.nodes[sourceId];
        if (!sourceNode) throw Error("Source node does not exist");

        sourceNode.outputs[action.payload.node.id] = edge;
        graph.nodes[action.payload.node.id].inputs[sourceId] = edge;

        graph.adjacencyList[sourceId] = {
          inputs: graph.adjacencyList[sourceId]?.inputs ?? [],
          outputs: [...(graph.adjacencyList[sourceId]?.outputs ?? []), edge.id],
        };
        graph.adjacencyList[action.payload.node.id] = {
          outputs: graph.adjacencyList[action.payload.node.id]?.outputs ?? [],
          inputs: [
            ...(graph.adjacencyList[action.payload.node.id]?.inputs ?? []),
            edge.id,
          ],
        };

        graph.edges[edge.id] = edge;
      }
    );

    Object.entries(action.payload.node.outputs).forEach(
      ([targetId, edge]: [string, Edge]) => {
        const targetNode = graph.nodes[targetId];
        if (!targetNode) throw Error("Source node does not exist");

        targetNode.outputs[action.payload.node.id] = edge;
        graph.nodes[action.payload.node.id].outputs[targetId] = edge;

        graph.adjacencyList[targetId] = {
          ...graph.adjacencyList[targetId],
          inputs: [
            ...(graph.adjacencyList[targetId]?.inputs ?? []),
            action.payload.node.id,
          ],
        };
        graph.adjacencyList[action.payload.node.id] = {
          ...graph.adjacencyList[action.payload.node.id],
          outputs: [
            ...(graph.adjacencyList[action.payload.node.id]?.outputs ?? []),
            targetId,
          ],
        };
      }
    );
  },
  removeNode: (
    state: GraphsManagerState,
    action: PayloadAction<{ graphId: string; nodeId: string }>
  ) => {
    const graph = state.graphs[action.payload.graphId];
    const node = graph.nodes[action.payload.nodeId];
    if (node === null) throw Error("Node does not exist");

    delete graph.nodes[action.payload.nodeId];
    delete graph.adjacencyList[action.payload.nodeId];
    Object.values(graph.edges).forEach((edge) => {
      if (edge.sourceId === action.payload.nodeId) {
        delete graph.edges[edge.id];
      }
      if (edge.targetId === action.payload.nodeId) {
        delete graph.edges[edge.id];
      }
    });
  },
  updateNode: (
    state: GraphsManagerState,
    action: PayloadAction<{ graphId: string; node: Node }>
  ) => {
    const graph = state.graphs[action.payload.graphId];
    const node = graph.nodes[action.payload.node.id];
    if (node === null) throw Error("Node does not exist");

    graph.nodes[action.payload.node.id] = { ...node, ...action.payload.node };
  },
  addEdge: (
    state: GraphsManagerState,
    action: PayloadAction<{ graphId: string; edge: Edge }>
  ) => {
    const graph = state.graphs[action.payload.graphId];
    const edge = graph.edges[action.payload.edge.id];
    if (edge) throw Error("Edge already exists");

    graph.edges[action.payload.edge.id] = action.payload.edge;
    graph.adjacencyList[action.payload.edge.sourceId].outputs.push(
      action.payload.edge.id
    );
    graph.adjacencyList[action.payload.edge.targetId].inputs.push(
      action.payload.edge.id
    );

    graph.nodes[action.payload.edge.sourceId].outputs[
      action.payload.edge.targetId
    ] = action.payload.edge;
    graph.nodes[action.payload.edge.targetId].inputs[
      action.payload.edge.sourceId
    ] = action.payload.edge;
  },
  removeEdge: (
    state: GraphsManagerState,
    action: PayloadAction<{ graphId: string; edgeId: string }>
  ) => {
    const graph = state.graphs[action.payload.graphId];
    const edge = graph.edges[action.payload.edgeId];
    if (edge === null) throw Error("Edge does not exist");

    delete graph.edges[action.payload.edgeId];
    graph.adjacencyList[edge.sourceId].outputs = graph.adjacencyList[
      edge.sourceId
    ].outputs.filter((id) => id !== edge.id);
    graph.adjacencyList[edge.targetId].inputs = graph.adjacencyList[
      edge.targetId
    ].inputs.filter((id) => id !== edge.id);
  },
};
