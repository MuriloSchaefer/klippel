import {
  addNode,
  updateNode,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { MaterialsModuleState } from "@system/modules/Materials/store/state";
import {
  addMaterial,
  changeMaterial,
  materialAdded,
  materialChanged,
  partSelected,
  partUnselected,
  selectPart,
  unselectPart,
} from "./actions";
import { ComposerState } from "../state";
import { MaterialNode, CompositionGraph } from "./state";
import { detailsClosed } from "@kernel/modules/Layout/store/panels/actions";
import { GraphsManagerState } from "@kernel/modules/Graphs/store/state";
import { updateProxy } from "@kernel/modules/SVG/store/actions";
import { CSSProperties } from "react";

const middlewares = createListenerMiddleware();
middlewares.startListening({
  actionCreator: addMaterial,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: { compositionsManager },
      Materials: { materials, materialTypes },
    } = getState() as {
      Composer: ComposerState;
      Materials: MaterialsModuleState;
    };

    const material = materials[payload.materialId];
    const materialType = materialTypes[material.type];
    const schema = materialType.schemas[materialType.latestSchema];

    // Add new node to graph
    const graphId =
      compositionsManager.compositions[payload.compositionName].graphId;
    const nodeId = `material-${payload.materialId}`;

    const materialNode: MaterialNode = {
      id: nodeId,
      type: "MATERIAL",
      label: material.attributes[schema.selector.principal],
      materialId: payload.materialId,
    };

    dispatch(
      addNode({
        graphId,
        node: materialNode,
        edges: {
          inputs: {},
          outputs: {},
        },
      })
    );

    dispatch(
      materialAdded({
        compositionName: payload.compositionName,
        materialId: payload.materialId,
        nodeId: nodeId,
      })
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: changeMaterial,
  effect: async (
    { payload: { compositionName, materialUsageId, materialId } },
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;

    const state = getState() as {
      Graph: GraphsManagerState;
      Composer: ComposerState;
      Materials: MaterialsModuleState;
    };

    const composition =
      state.Composer.compositionsManager.compositions[compositionName];
    const graph = state.Graph.graphs[composition.graphId] as CompositionGraph; // QUESTION: how to get typing in here without casting?
    const material = state.Materials.materials[materialId];
    const materialType = state.Materials.materialTypes[material.type];

    const materialNodeId = `material-${materialId}`;

    const nodeExists = materialNodeId in graph.nodes;
    if (!nodeExists) {
      dispatch(addMaterial({ compositionName: composition.name, materialId }));
    }

    const usageNode = graph.nodes[materialUsageId];

    // const color =
    //   materialNode && "color" in materialNode ? materialNode.color : "none";
    if (
      "proxies" in usageNode &&
      usageNode.proxies.length > 0 &&
      "cor" in material.attributes // QUESTION: how to keep its definition pt and its link here in en
    ) {
      // process proxies
      const allChanges = usageNode.proxies.reduce(
        (acc, { attr, elem }) => ({
          ...acc,
          [elem]: { ...acc[elem], [attr]: material.attributes["cor"].hex },
        }),
        {} as { [id: string]: CSSProperties }
      );
      console.log(allChanges)
      Object.entries(allChanges).forEach(([id, changes]) => {
        dispatch(
          updateProxy({
            path: composition.svgPath,
            proxySet: composition.name,
            id: id,
            changes: changes,
          })
        );
      });
    }

    dispatch(
      updateNode({
        graphId: composition.graphId,
        nodeId: materialUsageId,
        changes: { materialId: materialNodeId },
      })
    );

    dispatch(
      materialChanged({
        compositionName,
        materialUsageId,
        materialId: materialNodeId,
      })
    );
  },
});

middlewares.startListening({
  actionCreator: selectPart,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(partSelected(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: detailsClosed,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: {
        compositionsManager: { compositions },
      },
    } = getState() as { Composer: ComposerState };

    const composition = Object.values(compositions).find(
      (comp) => comp.viewportName === payload.viewportName
    );
    if (composition) {
      dispatch(unselectPart({ compositionName: composition.name }));
    }
  },
});

middlewares.startListening({
  actionCreator: unselectPart,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(partUnselected({ compositionName: payload.compositionName })); // dispatch event
  },
});

export default middlewares;
