import { CSSProperties, useCallback, useMemo, useRef } from "react";
import { useStore } from "react-redux";
import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import { ILayoutModule } from "@kernel/modules/Layout";
import {
  addNode as addNodeAction,
  removeNode as removeNodeAction,
  updateNode as updateNodeAction,
  addEdge as addEdgeAction,
  removeEdge as removeEdgeAction,
  updateEdge as updateEdgeAction,
} from "@kernel/modules/Graphs/store/graphInstance/actions";
import {
  addProxy as addProxyAction,
  updateProxy as updateProxyAction,
  deleteProxy as deleteProxyAction,
} from "@kernel/modules/SVG/store/actions";
import { selectPart } from "../store/variations/actions";
import {
  MaterialNode,
  PartNode,
  ElectiveNode,
  GraduationNode,
  VisualizationDom,
  VisualizationNode,
  ProcessNode,
  ProcessOfEdge,
  HasProcessEdge,
  ConsumesEdge,
  ConsumedByEdge,
} from "../typings";
import { EdgeMap } from "@kernel/modules/Graphs/hooks/useGraph";
import { IMaterialsModule } from "@system/modules/Materials";
import { useTheme } from "@mui/material";
import { CompoundValue } from "@system/modules/Converter/typings";
import {
  recomputeAllGradeDeltas,
  recomputeGradeDelta,
  dropGraduationFromEdge,
} from "../utils/consumptionPerGrade";
import { GraphState } from "@kernel/modules/Graphs/store/state";

export function useVariationActions({ variationId }: { variationId: string }) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const layoutModule = useModule<ILayoutModule>("Layout");

  const dispatch = storeModule.hooks.useAppDispatch();
  const store = useStore();
  const vp = layoutModule.hooks.useActiveViewport();
  const vpMgr = layoutModule.hooks.useViewportManager();

  const { useMaterials, useMaterialTypes } = materialsModule.hooks;
  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  // Refs let action callbacks always see fresh values without invalidating useMemo.
  const materialsRef = useRef(materials);
  materialsRef.current = materials;
  const materialTypesRef = useRef(materialTypes);
  materialTypesRef.current = materialTypes;
  const themeRef = useRef(theme);
  themeRef.current = theme;

  const markChanged = useCallback(() => {
    if (vp) vpMgr.functions.setHasChanged(vp.name, true);
  }, [vp?.name]);

  // Reads graph state at call time — no subscription cost.
  const getGraph = useCallback(
    (): GraphState | undefined =>
      (store.getState() as any)?.Graph?.graphs?.[variationId],
    [variationId],
  );

  // Reads the SVG path for this variation at call time — no subscription cost.
  const getSvgPath = useCallback(
    (): string | undefined =>
      (store.getState() as any)?.Composer?.variations?.[variationId]?.svg,
    [variationId],
  );

  return useMemo(
    () => ({
      actions: {
        selectPart: (partId: string) => {
          dispatch(selectPart({ variationId, partId }));
        },

        addPart: (name: string, parentId: string) => {
          const g = getGraph();
          let id = name.toLowerCase().replaceAll(/\s+/g, "-");
          let i = 1;
          while (id in (g?.nodes ?? {})) {
            id += "-" + i;
            i++;
          }
          const node: PartNode = {
            id,
            type: "PART",
            label: name,
            position: { x: 0, y: 0 },
          };
          const edges: EdgeMap = {
            inputs: {
              [`${parentId}-${id}`]: {
                id: `${parentId}-${id}`,
                type: "HAS_PART",
                sourceId: parentId,
                targetId: id,
              },
            },
            outputs: {
              [`${id}-${parentId}`]: {
                id: `${id}-${parentId}`,
                type: "PART_OF",
                sourceId: id,
                targetId: parentId,
              },
            },
          };
          dispatch(addNodeAction({ graphId: variationId, node, edges }));
          markChanged();
        },

        removePart: (partId: string) => {
          dispatch(removeNodeAction({ graphId: variationId, nodeId: partId }));
          markChanged();
        },

        addMaterial: (materialId: number, label: string, typeRestrictions: string[]) => {
          const material = materialsRef.current?.[materialId];
          if (!material) {
            console.error("Material not found:", materialId);
            return;
          }
          const nodeId = label.toLowerCase().replaceAll(/\s+/g, "-");
          const node: MaterialNode = {
            id: nodeId,
            type: "MATERIAL",
            label,
            materialId,
            position: { x: 0, y: 0 },
            typeRestrictions,
          };
          dispatch(
            addNodeAction({
              graphId: variationId,
              node,
              edges: {
                inputs: {
                  [`garment-${nodeId}`]: {
                    id: `garment-${nodeId}`,
                    type: "HAS_MATERIAL",
                    sourceId: "garment",
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-garment`]: {
                    id: `${nodeId}-garment`,
                    type: "MATERIAL_OF",
                    sourceId: nodeId,
                    targetId: "garment",
                  },
                },
              },
            }),
          );
          markChanged();
        },

        removeMaterialNode: (nodeId: string) => {
          const g = getGraph();
          const node = g?.nodes?.[nodeId];
          if (!node || node.type !== "MATERIAL") {
            console.error("Material node not found for id:", nodeId);
            return;
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        addElective: (name: string, garmentId: string, defaultValue: boolean = false) => {
          const hash = Math.random().toString(36).slice(2, 8);
          const nodeId = `elective-${hash}`;
          const node: ElectiveNode = {
            id: nodeId,
            type: "ELECTIVE",
            label: name,
            electiveId: hash,
            value: defaultValue,
            defaultValue,
            position: { x: 0, y: 0 },
          };
          dispatch(
            addNodeAction({
              graphId: variationId,
              node,
              edges: {
                inputs: {
                  [`${garmentId}-${nodeId}`]: {
                    id: `${garmentId}-${nodeId}`,
                    type: "HAS_ELECTIVE",
                    sourceId: garmentId,
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-${garmentId}`]: {
                    id: `${nodeId}-${garmentId}`,
                    type: "ELECTIVE_OF",
                    sourceId: nodeId,
                    targetId: garmentId,
                  },
                },
              },
            }),
          );
          markChanged();
        },

        removeElective: (nodeId: string) => {
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateElective: (nodeId: string, changes: Partial<ElectiveNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId];
          if (!curr) return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...changes },
            }),
          );
          markChanged();
        },

        addVisualization: (
          name: string,
          garmentId: string,
          materialNodeId: string,
          doms: VisualizationDom[],
        ) => {
          const g = getGraph();
          const hash = Math.random().toString(36).slice(2, 8);
          const nodeId = `visualization-${hash}`;
          dispatch(
            addNodeAction({
              graphId: variationId,
              node: {
                id: nodeId,
                type: "VISUALIZATION",
                label: name,
                visualizationId: hash,
                materialNodeId,
                doms,
                position: { x: 0, y: 0 },
              } as any,
              edges: {
                inputs: {
                  [`${materialNodeId}-${nodeId}`]: {
                    id: `${materialNodeId}-${nodeId}`,
                    type: "HAS_VISUALIZATION",
                    sourceId: materialNodeId,
                    targetId: nodeId,
                  },
                },
                outputs: {
                  [`${nodeId}-${materialNodeId}`]: {
                    id: `${nodeId}-${materialNodeId}`,
                    type: "VISUALIZATION_OF",
                    sourceId: nodeId,
                    targetId: materialNodeId,
                  },
                },
              },
            }),
          );
          const materialNode = g?.nodes[materialNodeId] as MaterialNode | undefined;
          if (!materialNode) {
            console.error("Material node not found:", materialNodeId);
            return;
          }
          const mat = materialsRef.current![materialNode.materialId];
          const schema = materialTypesRef.current[mat.type]?.schemas[mat.schemaVersion];
          const colorAttr = Object.entries(schema.attributes).find(([, v]) => v === "color");
          if (!colorAttr) {
            console.error("No color attribute found for material type:", mat.type);
            return;
          }
          const colorHex = mat.attributes[colorAttr[0]].hex as string;
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const dom of doms) {
              const proxy: Partial<CSSProperties> = {};
              if (dom.fill) proxy.fill = colorHex;
              if (dom.stroke) proxy.stroke = colorHex;
              dispatch(
                addProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: dom.id,
                  styles: proxy as CSSProperties,
                }),
              );
            }
          }
          markChanged();
        },

        removeVisualization: (nodeId: string) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as VisualizationNode | undefined;
          if (!curr) return;
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const dom of curr.doms) {
              dispatch(
                deleteProxyAction({ path: svgPath, instanceName: variationId, id: dom.id }),
              );
            }
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateVisualization: (nodeId: string, changes: Partial<VisualizationNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId] as VisualizationNode | undefined;
          if (!curr) return;
          const updatedNode = { ...curr, ...changes } as VisualizationNode;
          dispatch(updateNodeAction({ graphId: variationId, nodeId, changes: updatedNode }));

          if (!changes.doms && !changes.materialNodeId) return;
          if (curr.materialNodeId === updatedNode.materialNodeId && curr.doms === updatedNode.doms)
            return;

          dispatch(removeEdgeAction({ graphId: variationId, edgeId: `${curr.materialNodeId}-${curr.id}` }));
          dispatch(removeEdgeAction({ graphId: variationId, edgeId: `${curr.id}-${curr.materialNodeId}` }));
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                id: `${updatedNode.materialNodeId}-${updatedNode.id}`,
                type: "HAS_VISUALIZATION",
                sourceId: updatedNode.materialNodeId,
                targetId: updatedNode.id,
              },
            }),
          );
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                id: `${updatedNode.id}-${updatedNode.materialNodeId}`,
                type: "VISUALIZATION_OF",
                sourceId: updatedNode.id,
                targetId: updatedNode.materialNodeId,
              },
            }),
          );

          const currMaterialNode = g.nodes[updatedNode.materialNodeId] as MaterialNode | undefined;
          if (!currMaterialNode) {
            console.error("Material node not found:", curr.materialNodeId);
            return;
          }
          const currMaterial = materialsRef.current![currMaterialNode.materialId];
          const schema =
            materialTypesRef.current[currMaterial.type]?.schemas[currMaterial.schemaVersion];
          const colorAttr = Object.entries(schema.attributes).find(([, v]) => v === "color");
          if (!colorAttr) {
            console.error("No color attribute found for material type:", currMaterial.type);
            return;
          }
          const colorHex = currMaterial.attributes[colorAttr[0]].hex as string;
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const dom of curr.doms) {
              dispatch(deleteProxyAction({ path: svgPath, instanceName: variationId, id: dom.id }));
            }
            for (const dom of updatedNode.doms) {
              const proxy: Partial<CSSProperties> = {};
              if (dom.fill) proxy.fill = colorHex;
              if (dom.stroke) proxy.stroke = colorHex;
              dispatch(
                updateProxyAction({
                  path: svgPath,
                  instanceName: variationId,
                  id: dom.id,
                  changes: proxy as CSSProperties,
                }),
              );
            }
          }
          markChanged();
        },

        updateMaterial: (nodeId: string, materialId: number) => {
          const g = getGraph();
          if (!g) return;
          const newNode = { ...g.nodes[nodeId], materialId } as MaterialNode;
          dispatch(updateNodeAction({ graphId: variationId, nodeId, changes: newNode }));

          const material = materialsRef.current![materialId];
          const schema = materialTypesRef.current[material.type]?.schemas[material.schemaVersion];
          const colorAttr = Object.entries(schema.attributes).find(([, v]) => v === "color");
          if (!colorAttr) return;
          const colorHex = material.attributes[colorAttr[0]].hex as string;
          const visualizationEdges = Object.values(g.edges).filter(
            (edge) => edge.type === "HAS_VISUALIZATION" && edge.sourceId === nodeId,
          );
          const svgPath = getSvgPath();
          if (svgPath) {
            for (const edge of visualizationEdges) {
              const visualizationNode = g.nodes[edge.targetId] as VisualizationNode | undefined;
              if (!visualizationNode) return;
              for (const dom of visualizationNode.doms) {
                const proxy: Partial<CSSProperties> = {};
                if (dom.fill) proxy.fill = colorHex;
                if (dom.stroke) proxy.stroke = colorHex;
                dispatch(
                  updateProxyAction({
                    path: svgPath,
                    instanceName: variationId,
                    id: dom.id,
                    changes: proxy as CSSProperties,
                  }),
                );
              }
            }
          }
          markChanged();
        },

        addGraduations: (names: string[], garmentId: string) => {
          const g = getGraph();
          const graduationEdges = g
            ? Object.values(g.edges).filter(
                (e: any) => e.sourceId === garmentId && e.type === "HAS_GRADUATION",
              )
            : [];
          const graduationNodes = graduationEdges.map((e: any) =>
            g ? g.nodes[e.targetId] : undefined,
          );
          const maxOrder = graduationNodes.reduce(
            (m: number, n: any) => Math.max(m, n?.order ?? 0),
            -1,
          );
          names.forEach((name, i) => {
            const hash = Math.random().toString(36).slice(2, 8);
            const nodeId = `graduation-${hash}`;
            const node: GraduationNode = {
              id: nodeId,
              type: "GRADUATION",
              label: name,
              graduationId: hash,
              order: maxOrder + i + 1,
              amount: 0,
              position: { x: 0, y: 0 },
            };
            dispatch(
              addNodeAction({
                graphId: variationId,
                node,
                edges: {
                  inputs: {
                    [`${garmentId}-${nodeId}`]: {
                      id: `${garmentId}-${nodeId}`,
                      type: "HAS_GRADUATION",
                      sourceId: garmentId,
                      targetId: nodeId,
                    },
                  },
                  outputs: {
                    [`${nodeId}-${garmentId}`]: {
                      id: `${nodeId}-${garmentId}`,
                      type: "GRADUATION_OF",
                      sourceId: nodeId,
                      targetId: garmentId,
                    },
                  },
                },
              }),
            );
          });
          markChanged();
        },

        removeGraduation: (nodeId: string) => {
          const g = getGraph();
          if (g) {
            for (const edge of Object.values(g.edges)) {
              if (edge.type !== "CONSUMES" && edge.type !== "CONSUMED_BY") continue;
              const e = edge as ConsumesEdge | ConsumedByEdge;
              if (!(e as any).consumptionPerGrade?.[nodeId]) continue;
              const changes = dropGraduationFromEdge(e, nodeId);
              dispatch(updateEdgeAction({ graphId: variationId, edgeId: e.id, changes: changes as any }));
            }
          }
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateGraduation: (nodeId: string, changes: Partial<GraduationNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId];
          if (!curr) return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...changes },
            }),
          );
          markChanged();
        },

        reorderGraduations: (graduationIds: string[]) => {
          const g = getGraph();
          if (!g) return;
          graduationIds.forEach((id, index) => {
            const node = g.nodes[id] as GraduationNode;
            if (node.order !== index) {
              dispatch(
                updateNodeAction({
                  graphId: variationId,
                  nodeId: id,
                  changes: { ...node, order: index },
                }),
              );
            }
          });
          markChanged();
        },

        addProcessMaterialConsumption: (
          processNodeId: string,
          materialNodeId: string,
          amount: CompoundValue,
        ) => {
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                id: `${processNodeId}->${materialNodeId}`,
                type: "CONSUMES",
                sourceId: processNodeId,
                targetId: materialNodeId,
                amount,
              } as ConsumesEdge,
            }),
          );
          dispatch(
            addEdgeAction({
              graphId: variationId,
              edge: {
                type: "CONSUMED_BY",
                id: `${materialNodeId}->${processNodeId}`,
                targetId: processNodeId,
                sourceId: materialNodeId,
                amount,
              } as ConsumedByEdge,
            }),
          );
          markChanged();
        },

        removeProcessMaterialConsumption: (processNodeId: string, materialNodeId: string) => {
          dispatch(
            removeEdgeAction({ graphId: variationId, edgeId: `${processNodeId}->${materialNodeId}` }),
          );
          dispatch(
            removeEdgeAction({ graphId: variationId, edgeId: `${materialNodeId}->${processNodeId}` }),
          );
          markChanged();
        },

        updateProcessMaterialConsumption: (
          processNodeId: string,
          materialNodeId: string,
          newAmount: CompoundValue,
        ) => {
          const forwardId = `${processNodeId}->${materialNodeId}`;
          const reverseId = `${materialNodeId}->${processNodeId}`;
          const g = getGraph();
          const forward = g?.edges[forwardId] as ConsumesEdge | undefined;
          const nextDeltas = recomputeAllGradeDeltas(newAmount, forward?.consumptionPerGrade);
          dispatch(
            updateEdgeAction({
              graphId: variationId,
              edgeId: forwardId,
              changes: { amount: newAmount, gradeDeltas: nextDeltas } as any,
            }),
          );
          dispatch(
            updateEdgeAction({
              graphId: variationId,
              edgeId: reverseId,
              changes: { amount: newAmount, gradeDeltas: nextDeltas } as any,
            }),
          );
          markChanged();
        },

        setProcessMaterialConsumptionForGraduation: (
          processNodeId: string,
          materialNodeId: string,
          graduationId: string,
          consumption: CompoundValue,
        ) => {
          const forwardId = `${processNodeId}->${materialNodeId}`;
          const reverseId = `${materialNodeId}->${processNodeId}`;
          const g = getGraph();
          const forward = g?.edges[forwardId] as ConsumesEdge | undefined;
          if (!forward) return;
          const nextConsumption = {
            ...(forward.consumptionPerGrade ?? {}),
            [graduationId]: consumption,
          };
          const nextDeltas = { ...(forward.gradeDeltas ?? {}) };
          const delta = recomputeGradeDelta(forward.amount, consumption);
          if (delta !== undefined) nextDeltas[graduationId] = delta;
          else delete nextDeltas[graduationId];
          const changes = {
            consumptionPerGrade: nextConsumption,
            gradeDeltas: Object.keys(nextDeltas).length === 0 ? undefined : nextDeltas,
          };
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: forwardId, changes: changes as any }));
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: reverseId, changes: changes as any }));
          markChanged();
        },

        clearProcessMaterialConsumptionForGraduation: (
          processNodeId: string,
          materialNodeId: string,
          graduationId: string,
        ) => {
          const forwardId = `${processNodeId}->${materialNodeId}`;
          const reverseId = `${materialNodeId}->${processNodeId}`;
          const g = getGraph();
          const forward = g?.edges[forwardId] as ConsumesEdge | undefined;
          if (!forward) return;
          const changes = dropGraduationFromEdge(forward, graduationId);
          if (Object.keys(changes).length === 0) return;
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: forwardId, changes: changes as any }));
          dispatch(updateEdgeAction({ graphId: variationId, edgeId: reverseId, changes: changes as any }));
          markChanged();
        },

        addProcess: (process: {
          name: string;
          costTime: CompoundValue;
          costMoney: CompoundValue;
        }) => {
          const g = getGraph();
          if (!g) return;
          const hash = Math.random().toString(36).slice(2, 8);
          const nodeId = `process-${hash}`;
          const newNode = {
            type: "PROCESS",
            label: process.name,
            id: nodeId,
            costMoney: process.costMoney,
            costTime: process.costTime,
            position: { x: 0, y: 0 },
            processId: hash,
          } as ProcessNode;
          dispatch(
            addNodeAction({
              graphId: variationId,
              node: newNode,
              edges: {
                inputs: {
                  [`garment->${nodeId}`]: {
                    type: "HAS_PROCESS",
                    id: `garment->${nodeId}`,
                    sourceId: "garment",
                    targetId: nodeId,
                  } as HasProcessEdge,
                },
                outputs: {
                  [`${nodeId}->garment`]: {
                    type: "PROCESS_OF",
                    id: `${nodeId}->garment`,
                    sourceId: nodeId,
                    targetId: "garment",
                  } as ProcessOfEdge,
                },
              },
            }),
          );
          markChanged();
        },

        removeProcess: (nodeId: string) => {
          const g = getGraph();
          if (!g) return;
          dispatch(removeNodeAction({ graphId: variationId, nodeId }));
          markChanged();
        },

        updateProcess: (nodeId: string, changes: Partial<ProcessNode>) => {
          const g = getGraph();
          if (!g) return;
          const curr = g.nodes[nodeId];
          if (!curr) return;
          dispatch(
            updateNodeAction({
              graphId: variationId,
              nodeId,
              changes: { ...curr, ...changes },
            }),
          );
          markChanged();
        },
      },
    }),
    [variationId, dispatch, markChanged, getGraph, getSvgPath],
  );
}
