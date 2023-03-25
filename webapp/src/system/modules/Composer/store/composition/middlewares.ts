import { addNode } from "@kernel/modules/Graphs/store/graphInstance/actions";
import { createListenerMiddleware, PayloadAction } from "@reduxjs/toolkit";
import { MaterialsModuleState } from "@system/modules/Materials/store/state";
import {
  addMaterial,
  materialAdded,
  partSelected,
  partUnselected,
  selectPart,
  unselectPart,
} from "./actions";
import { ComposerState } from "../state";
import { MaterialNode } from "./state";
import { detailsClosed } from "@kernel/modules/Layout/store/panels/actions";

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
      dispatch(unselectPart({compositionName: composition.name}));
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
