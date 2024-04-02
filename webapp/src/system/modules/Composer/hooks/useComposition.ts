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
  changeMaterial,
  deleteProxy,
  deleteRestriction,
  selectPart,
  updateRestriction,
} from "../store/composition/actions";
import { ComposerState } from "../store/state";
import type { IMaterialsModule } from '../../Materials/index';
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
  changeProperties(name:string, description: string): void;

  addPart(name: string, domId: string, parentName?: string): void;
  removePart(partId: string): void;
  selectPart(partName: string): void;

  addMaterialUsage(label: string, partId:string, allowedMaterialTypes: string[]): void;
  removeMaterialUsage(materialUsageId: string): void;

  removeRestriction(materialId:string, restrictionId:string): void;
  addRestriction(materialId:string, restriction:RestrictionNode): void;
  updateRestriction(materialId:string, restrictionId: string, changes:Partial<RestrictionNode>): void;

  removeOperation(operationId: string): void;
  addOperation(label: string, cost: CompoundValue, time_taken: CompoundValue, partId: string): void;
  addMaterialConsuption(operationId: string, materialId:string, quantity: CompoundValue): void;
  deleteMaterialConsuption(consuptionId: string):void
  updateMaterialConsuption(consuptionId: string, changes: Partial<ConsumesEdge>): void

  changeMaterialType(materialUsageId: string, materialType: string): void;
  changeMaterial(materialUsageId: string, material: number): void;

  addProxy(proxy: Proxy, materialId:string): void;
  deleteProxy(proxyId: string, materialId:string): void;
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
  compositionName: string,
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
  const {useMaterials} = materialsModule.hooks

  const selector = createSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName],
    compositionSelector
  );
  const compositionState = useAppSelector(selector);

  const innerState = useAppSelector(
    (state: { Composer: ComposerState } | undefined) =>
      state && state.Composer.compositionsManager.compositions[compositionName]
  );

  const graph = useGraph<CompositionGraph, Partial<CompositionGraph>>(
    innerState?.graphId!,
    (g) => ({
      adjacencyList: g?.adjacencyList,
      nodes: g?.nodes
    })
  );

  const materials = useMaterials()

  return {
    state: compositionState,
    actions: {
      changeProperties(name, description){
        const rootNode = graph.state?.nodes?.garment as GarmentNode
        if (!rootNode) throw Error('root node not found')
        const updatedNode = {...rootNode, label: name, description }
        graph.actions.updateNode(updatedNode)
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
            outputs: {}
          };
        }
        graph.actions.addNode(newPart, edges);
      },
      removePart(partId){
        // TODO: remove all material usage, operations
        // TODO: link subparts to the parent node
        graph.actions.removeNode(partId)
      },
      addMaterialUsage(label, partId, materialTypes){
        materialTypes.forEach(type => {
          if (!Object.values(graph.state?.nodes ?? {}).find(n => n.id === type)){
            console.log('adding type node')
            graph.actions.addNode({
              id: type,
              type: 'MATERIAL_TYPE',
              label: materials[type].label,

            })
          }

        })

        const nodeId = _.uniqueId(`material-usage-`)
        const materialUsageNode: MaterialUsageNode = {
          type: "MATERIAL_USAGE",
          id: nodeId,
          label: label,
          editableAttributes: ['materialType', 'materialId'],
          materialId: "material-12",
          materialType: materialTypes[0] ?? 'malha', // TODO: allow null values
          position: {x: 0, y: 0},
          proxies: [],
        }
        const restrictionNodeId = `${nodeId}-restriction-1`
        

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
            outputs: {}
          };
        graph.actions.addNode(materialUsageNode, edges);

        // add default restrictions
        const materialDefaultRestrictions: AllowOnlyRestrictionNode = {
          type: "RESTRICTION",
          restrictionType: 'allowOnly',
          attribute: 'materialType',
          id: restrictionNodeId,
          label: 'Permitido apenas',
          operand: materialTypes,
          position: {x: 0, y: 0},
        }
        const restrictionEdgeId = `${nodeId}->${restrictionNodeId}`
        const restrictionEdges = {
          inputs: {
            [restrictionEdgeId]: {
              id: restrictionEdgeId,
              sourceId: nodeId,
              targetId: restrictionNodeId,
              attr:'materialType',
              type: "RESTRICTED_BY",
            },
          },
          outputs: {}
        };
        graph.actions.addNode(materialDefaultRestrictions, restrictionEdges);
      },
      removeMaterialUsage(materialUsageId){
        graph.actions.removeNode(materialUsageId)
      },
      addRestriction(materialId, restriction){
        dispatch(addRestriction({ compositionName, materialId, restriction }));
      },
      updateRestriction(materialId, restrictionId, changes){
        dispatch(updateRestriction({ compositionName, materialId, restrictionId, changes }));
      },
      removeRestriction(materialId, restrictionId){
        dispatch(deleteRestriction({ compositionName, materialId, restrictionId }));
      },
      removeOperation(operationId){
        graph.actions.removeNode(operationId)
      },
      addOperation(label, cost, time_taken, partId){
        const nodeId = _.uniqueId(`operation-`)
        const edgeId = `${partId}->${nodeId}`
        const node: OperationNode = {
          id: nodeId,
          type: "OPERATION",
          label: label,
          position: {x: 0, y: 0},
          cost: cost,
          time_taken: time_taken
        }
        const edges = {
          inputs: {
            [edgeId]: {
              id: edgeId,
              sourceId: partId,
              targetId: nodeId,
              type: "PROCESS_NEEDED",
            },
          },
          outputs: {}
        };
        graph.actions.addNode(node, edges);
      },
      updateMaterialConsuption: (consumptionId, changes)=>{
        graph.actions.updateEdge(consumptionId, changes)
      },
      deleteMaterialConsuption: (consumptionId)=>{
        graph.actions.removeEdge(consumptionId)
      },
      addMaterialConsuption: (operationId, materialId, quantity)=>{
        const edge: ConsumesEdge = {
          id: `${operationId}->${materialId}`,
          sourceId: operationId,
          targetId: materialId,
          type: 'CONSUMES',
          quantity
        }
        graph.actions.addEdge(edge)
      },
      selectPart(partName) {
        dispatch(selectPart({ compositionName, partName }));
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

      addProxy(proxy, materialId){
        dispatch(addProxy({compositionName, materialId, proxy}))
      },
      deleteProxy(proxyId, materialId){
        dispatch(deleteProxy({compositionName, materialId, proxyId}))
        //svg.actions.deleteProxy(proxyId, compositionName)
      },
      updateProxy(){},
    },
  };
};

export default useComposition;
