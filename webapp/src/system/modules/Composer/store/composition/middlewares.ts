import {
  addEdge,
  addNode,
  invalidateSearch,
  removeEdge,
  removeNode,
  updateNode,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import { createListenerMiddleware } from "@reduxjs/toolkit";
import type { MaterialsModuleState } from "@system/modules/Materials/store/state";
import {
  addedToBudget,
  addMaterial,
  addProxy,
  addRestriction,
  addToBudget,
  changeGradeCounter,
  changeMaterial,
  deleteProxy,
  deleteRestriction,
  gradeCounterChanged,
  materialAdded,
  materialChanged,
  partSelected,
  partUnselected,
  proxyAdded,
  proxyDeleted,
  restrictionAdded,
  restrictionDeleted,
  restrictionUpdated,
  selectPart,
  unselectPart,
  updateRestriction,
} from "./actions";
import { ComposerState } from "../state";
import { MaterialNode, CompositionGraph, RestrictedByEdge } from "./state";
import {
  detailsClosed,
  openDetails,
} from "@kernel/modules/Layout/store/panels/actions";
import { GraphsManagerState } from "@kernel/modules/Graphs/store/state";
import {
  deleteProxy as deleteSVGProxy,
  addProxy as addSVGProxy,
  updateProxy,
  updateSVG,
} from "@kernel/modules/SVG/store/actions";
import { CSSProperties } from "react";
import { SVGModuleState } from "@kernel/modules/SVG/store/state";

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
      position: { x: 0, y: 0 },
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
      SVG: SVGModuleState;
    };

    const composition =
      state.Composer.compositionsManager.compositions[compositionName];
    const graph = state.Graph.graphs[composition.graphId] as CompositionGraph; // QUESTION: how to get typing in here without casting?
    const material = state.Materials.materials[materialId];

    const materialNodeId = `material-${materialId}`;

    const nodeExists = materialNodeId in graph.nodes;
    if (!nodeExists) {
      dispatch(addMaterial({ compositionName: composition.name, materialId }));
    }

    const usageNode = graph.nodes[materialUsageId];
    const linkedMaterials = Object.values(graph.edges).filter(
      (edge) => edge.sourceId === materialUsageId && edge.type == "CONSUMES"
    );

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

      const svgInstance =
        state.SVG.svgs[composition.svgPath].instances[composition.name];
      const originalContent = state.SVG.svgs[composition.svgPath].content;
      const content = svgInstance.content || originalContent;
      if (content) {
        const svgRoot = new DOMParser()
          .parseFromString(content, "image/svg+xml")
          .querySelector("svg");
        if (svgRoot) {
          Object.entries(allChanges).forEach(([id, properties]) => {
            const element = svgRoot?.getElementById(id);
            Object.entries(properties).forEach(([attr, value]) => {
              element?.setAttribute(attr, value);
            });

            dispatch(
              updateProxy({
                path: composition.svgPath,
                instanceName: composition.name,
                id: id,
                changes: properties,
              })
            );
      
          });

          const serialized = new XMLSerializer().serializeToString(svgRoot);
          dispatch(
            updateSVG({
              path: composition.svgPath,
              instanceName: composition.name,
              document: serialized,
            })
          );
        }
      }
    }

    dispatch(
      updateNode({
        graphId: composition.graphId,
        nodeId: materialUsageId,
        changes: { materialId: materialNodeId },
      })
    );

    dispatch(
      addEdge({
        edge: {
          id: `${materialUsageId}->${materialNodeId}`,
          sourceId: materialUsageId,
          targetId: materialNodeId,
          type: "CONSUMES",
        },
        graphId: composition.graphId,
      })
    );

    linkedMaterials.forEach((lm) => {
      dispatch(removeEdge({ graphId: composition.graphId, edgeId: lm.id }));
    });

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

    dispatch(openDetails());

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

middlewares.startListening({
  actionCreator: addRestriction,
  effect: async (
    { payload: { compositionName, materialId, restriction } },
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;

    const {
      Composer: {
        compositionsManager: { compositions },
      },
      Graph: { graphs },
      // Materials: { materials },
    } = getState() as {
      Composer: ComposerState;
      Graph: GraphsManagerState;
      // Materials: MaterialsModuleState;
    };
    const comp = compositions[compositionName];
    const { searchResults } = graphs[comp.graphId] as CompositionGraph;

    dispatch(
      addNode({
        graphId: comp.graphId,
        node: restriction,
        edges: {
          inputs: {
            [materialId]: {
              id: `${materialId}->${restriction.id}`,
              type: "RESTRICTED_BY",
              attr: restriction.attribute,
              sourceId: materialId,
              targetId: restriction.id,
            } as RestrictedByEdge,
          },
          outputs: {},
        },
      })
    );

    Object.entries(searchResults)
      .filter(
        ([searchId, result]) => !!searchId.includes("restriction") // invalidate all restriction searches
      )
      .forEach(([searchId, result]) =>
        dispatch(invalidateSearch({ graphId: comp.graphId, searchId }))
      );

    dispatch(
      restrictionAdded({
        compositionName,
        materialId,
        restrictionId: restriction.id,
      })
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: updateRestriction,
  effect: async (
    { payload: { compositionName, materialId, restrictionId, changes } },
    listenerApi
  ) => {
    const { dispatch, getState } = listenerApi;

    const {
      Composer: {
        compositionsManager: { compositions },
      },
      Graph: { graphs },
      // Materials: { materials },
    } = getState() as {
      Composer: ComposerState;
      Graph: GraphsManagerState;
      // Materials: MaterialsModuleState;
    };
    const comp = compositions[compositionName];
    const { searchResults } = graphs[comp.graphId] as CompositionGraph;

    dispatch(
      updateNode({
        graphId: comp.graphId,
        nodeId: restrictionId,
        changes: changes,
      })
    );

    Object.entries(searchResults)
      .filter(
        ([searchId, result]) =>
          !!result.findings.find((n) => n.id === restrictionId) // invalidate all restriction searches that had found this restriction
      )
      .forEach(([searchId, result]) =>
        dispatch(invalidateSearch({ graphId: comp.graphId, searchId }))
      );

    dispatch(
      restrictionUpdated({
        compositionName,
        materialId,
        restrictionId: restrictionId,
      })
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: deleteRestriction,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;

    const {
      Composer: {
        compositionsManager: { compositions },
      },
      Graph: { graphs },
      // Materials: { materials },
    } = getState() as {
      Composer: ComposerState;
      Graph: GraphsManagerState;
      // Materials: MaterialsModuleState;
    };
    const comp = compositions[payload.compositionName];
    const { searchResults } = graphs[comp.graphId] as CompositionGraph;

    dispatch(
      removeNode({ graphId: comp.graphId, nodeId: payload.restrictionId })
    );

    Object.entries(searchResults)
      .filter(
        ([searchId, result]) =>
          !!result.findings.find((n) => n.id === payload.restrictionId)
      )
      .forEach(([searchId, result]) =>
        dispatch(invalidateSearch({ graphId: comp.graphId, searchId }))
      );

    dispatch(restrictionDeleted(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: deleteProxy,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: {
        compositionsManager: { compositions },
      },
      Graph: { graphs },
    } = getState() as { Composer: ComposerState; Graph: GraphsManagerState };
    const comp = compositions[payload.compositionName];
    const graph = graphs[comp.graphId] as CompositionGraph;

    if (!comp.selectedPart) {
      console.warn("trying to delete proxy without selecting a part");
      return;
    }

    const materialUsageNode = graph.nodes[payload.materialId];
    if (!("proxies" in materialUsageNode)) {
      // TODO: add error handling
      return;
    }
    const newProxies = materialUsageNode.proxies.filter(
      (p) => p.elem !== payload.proxyId
    );

    dispatch(
      updateNode({
        graphId: comp.graphId,
        nodeId: payload.materialId,
        changes: { proxies: newProxies },
      })
    ); // filter proxy
    dispatch(
      deleteSVGProxy({
        path: comp.svgPath,
        instanceName: comp.name,
        id: payload.proxyId,
      })
    );
    dispatch(proxyDeleted(payload)); // dispatch event
  },
});
middlewares.startListening({
  actionCreator: addProxy,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch, getState } = listenerApi;
    const {
      Composer: {
        compositionsManager: { compositions },
      },
      Graph: { graphs },
      Materials: { materials },
    } = getState() as {
      Composer: ComposerState;
      Graph: GraphsManagerState;
      Materials: MaterialsModuleState;
    };
    const comp = compositions[payload.compositionName];
    const graph = graphs[comp.graphId] as CompositionGraph;

    if (!comp.selectedPart) {
      // TODO: add error handling
      console.error("trying to delete proxy without selecting a part");
      return;
    }

    const materialUsageNode = graph.nodes[payload.materialId];
    if (!("proxies" in materialUsageNode)) {
      // TODO: add error handling
      console.error(
        "trying to add proxy in an node that does not support proxies"
      );
      return;
    }
    const newProxies = [...materialUsageNode.proxies, payload.proxy];

    // set SVG colors based on curr material
    const materialId = Number(materialUsageNode.materialId.split("-")[1]);
    const material = materials[materialId];

    if (!("cor" in material.attributes)) {
      //TODO: add error handling
      console.error("material does not have a color attribute ");
      return;
    }
    const styles = newProxies
      .filter((p) => p.elem === payload.proxy.elem)
      .reduce(
        (acc, curr) => ({ ...acc, [curr.attr]: material.attributes.cor.hex }),
        {}
      );

    dispatch(
      updateNode({
        graphId: comp.graphId,
        nodeId: payload.materialId,
        changes: { proxies: newProxies },
      })
    ); // filter proxy
    dispatch(
      addSVGProxy({
        path: comp.svgPath,
        instanceName: comp.name,
        id: payload.proxy.elem,
        styles,
      })
    );
    dispatch(proxyAdded(payload)); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: addToBudget,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(
      addedToBudget({
        budgetId: payload.budgetId,
        compositionName: payload.compositionName,
      })
    ); // dispatch event
  },
});

middlewares.startListening({
  actionCreator: changeGradeCounter,
  effect: async ({ payload }, listenerApi) => {
    const { dispatch } = listenerApi;

    dispatch(gradeCounterChanged(payload)); // dispatch event
  },
});

export default middlewares;
