import { createSelector } from "reselect";
import _ from "lodash";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type { ILayoutModule } from "@kernel/modules/Layout";
import type { Store } from "@kernel/modules/Store";

import type { CompoundValue } from "@system/modules/Converter/typings";

import {
  addMaterialType,
  addProxy,
  addRestriction,
  addToBudget,
  changeGradeCounter,
  changeMaterial,
  deleteProxy,
  deleteRestriction,
  selectPart,
  updateRestriction,
} from "../store/composition/actions";
import { ComposerState } from "../store/state";
import type { IMaterialsModule } from "../../Materials/index";
import { GradeNode, HasGradeEdge } from "../store/composition/state";
import {
  AllowOnlyRestrictionNode,
  CompositionGraph,
  CompositionState,
  ConsumesEdge,
  GarmentNode,
  MaterialUsageNode,
  OperationNode,
  PartNode,
  Proxy,
  RestrictionNode,
} from "../store/composition/state";

interface CompositionActions {
  changeProperties(name: string, description: string): void;
  addGrade(abbreviation: string, order: number): void;
  removeGrade(id: string): void;
  reorderGrade(id: string, newOrder: number): void;
  changeGradeCounter(id: string, counter: number): void;
  addToBudget(id: string, budgetId: string): void;

  addPart(name: string, domId: string, parentName?: string): void;
  removePart(partId: string): void;
  selectPart(partName: string): void;

  addMaterialUsage(
    label: string,
    partId: string,
    allowedMaterialTypes: string[]
  ): void;
  removeMaterialUsage(materialUsageId: string): void;

  removeRestriction(materialId: string, restrictionId: string): void;
  addRestriction(materialId: string, restriction: RestrictionNode): void;
  updateRestriction(
    materialId: string,
    restrictionId: string,
    changes: Partial<RestrictionNode>
  ): void;

  removeOperation(operationId: string): void;
  addOperation(
    label: string,
    cost: CompoundValue,
    time_taken: CompoundValue,
    partId: string
  ): void;
  addMaterialConsuption(
    operationId: string,
    materialId: string,
    quantity: CompoundValue
  ): void;
  deleteMaterialConsuption(consuptionId: string): void;
  updateMaterialConsuption(
    consuptionId: string,
    changes: Partial<ConsumesEdge>
  ): void;

  changeMaterialType(materialUsageId: string, materialType: string): void;
  changeMaterial(materialUsageId: string, material: number): void;

  addProxy(proxy: Proxy, materialId: string): void;
  deleteProxy(proxyId: string, materialId: string): void;
  updateProxy(): void;
}
export interface Composition<T = CompositionState> {
  state: T | undefined;
  actions: CompositionActions;
}

export interface NonNullComposition<T = CompositionState> {
  state: T;
  actions: CompositionActions;
}

const useComposition = <C = Composition, R = C>(
  filter: {
    compositionName?: string;
    viewportName?: string;
  },
  compositionSelector: (composition: CompositionState | undefined) => R
): Composition<R> => {
  const storeModule = useModule<Store>("Store");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");
  const materialsModule = useModule<IMaterialsModule>("Materials");

  const { useAppDispatch, useAppSelector } = storeModule.hooks;
  const dispatch = useAppDispatch();
  const panelsManager = layoutModule.hooks.usePanelsManager();
  const { useGraph } = graphModule.hooks;
  const { useMaterials } = materialsModule.hooks;

  const defaultSelector = (state: { Composer: ComposerState } | undefined) => {
    if (!state) return;
    const { compositionName, viewportName } = filter;
    if (compositionName)
      return state.Composer.compositionsManager.compositions[compositionName];
    if (viewportName)
      return Object.values(
        state.Composer.compositionsManager.compositions
      ).find((c) => c.viewportName === viewportName);
    console.warn("either compositionName or viewportName shall be provided");
  };

  const selector = createSelector(defaultSelector, compositionSelector);
  const compositionState = useAppSelector(selector);

  const innerState = useAppSelector(defaultSelector);

  const graph = useGraph<CompositionGraph, Partial<CompositionGraph>>(
    innerState?.graphId!,
    (g) => ({
      adjacencyList: g?.adjacencyList,
      nodes: g?.nodes,
      edges: g?.edges,
    })
  );

  const materials = useMaterials();

  return {
    state: compositionState,
    actions: {
      changeProperties(name, description) {
        const rootNode = graph.state?.nodes?.garment as GarmentNode;
        if (!rootNode) throw Error("root node not found");
        const updatedNode = { ...rootNode, label: name, description };
        graph.actions.updateNode(updatedNode);
      },
      addToBudget(id, budgetId) {
        const grades = Object.values(graph.state?.nodes ?? {})
          .filter((n) => n.type === "GRADE")
          .map((n) => n.id);

        dispatch(
          addToBudget({ compositionName: id, budgetId, gradesInfo: grades })
        );
      },
      addGrade(abbreviation, order) {
        const id = _.uniqueId(`${abbreviation}-grade-`);
        const grade: GradeNode = {
          type: "GRADE",
          id,
          abbreviation,
          position: { x: 0, y: 0 },
        };
        graph.actions.addNode(grade);
        const edge: HasGradeEdge = {
          type: "HAS_GRADE",
          id: `garment -> ${id}`,
          sourceId: "garment",
          targetId: id,
          order,
        };
        graph.actions.addEdge(edge);
      },
      reorderGrade(id, newOrder) {
        // change order of grade
        graph.actions.updateEdge(`garment -> ${id}`, {
          order: newOrder,
        } as Partial<HasGradeEdge>);

        // shift all subsequent grades
        Object.values(graph.state?.edges ?? {})
          .filter(
            (e): e is HasGradeEdge =>
              e.type === "HAS_GRADE" && e.order >= newOrder
          )
          .sort((a, b) => a.order - b.order)
          .forEach((e) =>
            graph.actions.updateEdge(e.id, {
              order: e.order + 1,
            } as Partial<HasGradeEdge>)
          );
      },
      removeGrade(id) {
        // remove grade node
        if (!graph.state?.edges || !graph.state.adjacencyList)
          throw Error("edges not defined");
        const adj = graph.state.adjacencyList[id];
        const edgeId = adj.inputs.at(0);
        if (!edgeId) throw Error("edges not found");
        const { order: oldOrder } = graph.state.edges[edgeId] as HasGradeEdge;
        graph.actions.removeNode(id);

        // adjust ordering
        Object.values(graph.state?.edges ?? {})
          .filter(
            (e): e is HasGradeEdge =>
              e.type === "HAS_GRADE" && e.order > oldOrder
          )
          .sort((a, b) => a.order - b.order)
          .forEach((e) =>
            graph.actions.updateEdge(e.id, {
              order: e.order - 1,
            } as Partial<HasGradeEdge>)
          );
      },
      changeGradeCounter(id, counter) {
        dispatch(changeGradeCounter({ compositionName: innerState?.name!, gradeId: id, counter }));
      },
      addPart(name, domId, parentName) {
        const newPart: PartNode = {
          type: "PART",
          id: name,
          label: name,
          position: { x: 0, y: 0 },
          domId: domId,
        };
        let edges = undefined;
        if (parentName) {
          const edgeId = `${parentName}->${name}`;
          edges = {
            inputs: {
              [edgeId]: {
                id: edgeId,
                sourceId: parentName,
                targetId: name,
                type: "COMPOSED_OF",
              },
            },
            outputs: {},
          };
        }
        graph.actions.addNode(newPart, edges);
      },
      removePart(partId) {
        // TODO: remove all material usage, operations
        // TODO: link subparts to the parent node
        graph.actions.removeNode(partId);
      },
      addMaterialUsage(label, partId, materialTypes) {
        materialTypes.forEach((type) => {
          if (
            !Object.values(graph.state?.nodes ?? {}).find((n) => n.id === type)
          ) {
            console.log("adding type node");
            graph.actions.addNode({
              id: type,
              type: "MATERIAL_TYPE",
              label: materials[type].label,
            });
          }
        });

        const nodeId = _.uniqueId(`material-usage-`);
        const materialUsageNode: MaterialUsageNode = {
          type: "MATERIAL_USAGE",
          id: nodeId,
          label: label,
          editableAttributes: ["materialType", "materialId"],
          materialId: "material-12",
          materialType: materialTypes[0] ?? "malha", // TODO: allow null values
          position: { x: 0, y: 0 },
          proxies: [],
        };
        const restrictionNodeId = `${nodeId}-restriction-1`;

        const edgeId = `${partId}->${nodeId}`;
        const edges = {
          inputs: {
            [edgeId]: {
              id: edgeId,
              sourceId: partId,
              targetId: nodeId,
              type: "MADE_OF",
            },
          },
          outputs: {},
        };
        graph.actions.addNode(materialUsageNode, edges);

        // add default restrictions
        const materialDefaultRestrictions: AllowOnlyRestrictionNode = {
          type: "RESTRICTION",
          restrictionType: "allowOnly",
          attribute: "materialType",
          id: restrictionNodeId,
          label: "Permitido apenas",
          operand: materialTypes,
          position: { x: 0, y: 0 },
        };
        const restrictionEdgeId = `${nodeId}->${restrictionNodeId}`;
        const restrictionEdges = {
          inputs: {
            [restrictionEdgeId]: {
              id: restrictionEdgeId,
              sourceId: nodeId,
              targetId: restrictionNodeId,
              attr: "materialType",
              type: "RESTRICTED_BY",
            },
          },
          outputs: {},
        };
        graph.actions.addNode(materialDefaultRestrictions, restrictionEdges);
      },
      removeMaterialUsage(materialUsageId) {
        graph.actions.removeNode(materialUsageId);
      },
      addRestriction(materialId, restriction) {
        dispatch(
          addRestriction({
            compositionName: innerState!.name,
            materialId,
            restriction,
          })
        );
      },
      updateRestriction(materialId, restrictionId, changes) {
        dispatch(
          updateRestriction({
            compositionName: innerState!.name,
            materialId,
            restrictionId,
            changes,
          })
        );
      },
      removeRestriction(materialId, restrictionId) {
        dispatch(
          deleteRestriction({
            compositionName: innerState!.name,
            materialId,
            restrictionId,
          })
        );
      },
      removeOperation(operationId) {
        graph.actions.removeNode(operationId);
      },
      addOperation(label, cost, time_taken, partId) {
        const nodeId = _.uniqueId(`operation-`);
        const edgeId = `${partId}->${nodeId}`;
        const node: OperationNode = {
          id: nodeId,
          type: "OPERATION",
          label: label,
          position: { x: 0, y: 0 },
          cost: cost,
          time_taken: time_taken,
        };
        const edges = {
          inputs: {
            [edgeId]: {
              id: edgeId,
              sourceId: partId,
              targetId: nodeId,
              type: "PROCESS_NEEDED",
            },
          },
          outputs: {},
        };
        graph.actions.addNode(node, edges);
      },
      updateMaterialConsuption: (consumptionId, changes) => {
        graph.actions.updateEdge(consumptionId, changes);
      },
      deleteMaterialConsuption: (consumptionId) => {
        graph.actions.removeEdge(consumptionId);
      },
      addMaterialConsuption: (operationId, materialId, quantity) => {
        const edge: ConsumesEdge = {
          id: `${operationId}->${materialId}`,
          sourceId: operationId,
          targetId: materialId,
          type: "CONSUMES",
          quantity,
        };
        graph.actions.addEdge(edge);
      },
      selectPart(partName) {
        dispatch(selectPart({ compositionName: innerState!.name, partName }));
        panelsManager.functions.openDetails();
      },
      changeMaterialType(materialUsageId, materialType) {
        // check if material type is in the graph
        if (!graph.actions.nodeExists(materialType)) {
          // add material to the model
          dispatch(
            addMaterialType({
              compositionName: innerState?.name!,
              materialType,
            })
          );
        }

        graph.actions.updateNode({
          id: materialUsageId,
          materialType: materialType,
        } as MaterialUsageNode);
      },
      changeMaterial(materialUsageId, materialId) {
        dispatch(
          changeMaterial({
            compositionName: innerState?.name!,
            materialUsageId,
            materialId,
          })
        );
      },

      addProxy(proxy, materialId) {
        dispatch(
          addProxy({ compositionName: innerState!.name, materialId, proxy })
        );
      },
      deleteProxy(proxyId, materialId) {
        dispatch(
          deleteProxy({
            compositionName: innerState!.name,
            materialId,
            proxyId,
          })
        );
        //svg.actions.deleteProxy(proxyId, compositionName)
      },
      updateProxy() {},
    },
  };
};

export default useComposition;
