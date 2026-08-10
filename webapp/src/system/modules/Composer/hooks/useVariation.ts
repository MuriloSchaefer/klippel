import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Store } from "@kernel/modules/Store";
import { ILayoutModule } from "@kernel/modules/Layout";
import { selectPart } from "../store/variations/actions";
import {
  ComposerModuleState,
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
import { ISVGModule } from "@kernel/modules/SVG";
import { useTheme } from "@mui/material";
import { CompoundValue } from "@system/modules/Converter/typings";
import {
  recomputeAllGradeDeltas,
  recomputeGradeDelta,
  dropGraduationFromEdge,
} from "../utils/consumptionPerGrade";

export default function useVariation({ variationId }: { variationId: string }) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const svgModule = useModule<ISVGModule>("SVG");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const graphModule = useModule<IGraphModule>("Graph");

  const dispatch = storeModule.hooks.useAppDispatch();
  const { useGraph } = graphModule.hooks;
  const useAppSelector = storeModule.hooks.useAppSelector;
  const { useViewportManager, useActiveViewport } = layoutModule.hooks;

  const viewportManager = useViewportManager();

  const { useMaterialsGetter, useMaterialTypes } = materialsModule.hooks;

  const vp = useActiveViewport()

  const markChanged = () => {
    if (vp) viewportManager.functions.setHasChanged(vp.name, true);
  };

  // Read at call time, not subscribed: every use below is inside an action
  // closure, so a subscription only bought a re-render per catalog tick
  // (docs/analysis/materials-catalog-lag-analysis.md, F3).
  const getMaterials = useMaterialsGetter();
  const materialTypes = useMaterialTypes();

  const state = useAppSelector(
    (state: { Composer: ComposerModuleState }) =>
      state.Composer.variations[variationId],
  );
  const graph = useGraph(variationId);
  const svg = svgModule.hooks.useSVG(state?.svg!, variationId);

  return {
    state: state,
    actions: {
      selectPart: (partId: string) => {
        console.log("select part", partId);
        dispatch(selectPart({ variationId, partId }));
      },
      addPart: (name: string, parentId: string) => {
        let id = name.toLowerCase().replaceAll(/\s+/g, "-");
        let i = 1;
        while (id in (graph.state?.nodes ?? {})) {
          id += "-" + i;
          i++;
        }

        const node: PartNode = {
          id: id,
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

        graph.actions.addNode(node, edges);
        markChanged();
      },
      removePart: (partId: string) => { graph.actions.removeNode(partId); markChanged(); },
      addMaterial: (
        materialId: string,
        label: string,
        typeRestrictions: string[],
      ) => {
        const material = getMaterials()[materialId];
        if (!material) {
          console.error("Material not found:", materialId);
          return;
        }
        const nodeId = label.toLowerCase().replaceAll(/\s+/g, "-");
        const node: MaterialNode = {
          id: nodeId,
          type: "MATERIAL",
          label: label,
          materialId: materialId,
          position: { x: 0, y: 0 },
          typeRestrictions,
        };
        graph.actions.addNode(node, {
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
        });
        markChanged();
      },
      removeMaterialNode: (nodeId: string) => {
        const node = graph.state?.nodes?.[nodeId];
        if (!node || node.type !== "MATERIAL") {
          console.error("Material node not found for id:", nodeId);
          return;
        }
        graph.actions.removeNode(nodeId);
        markChanged();
      },
      addElective: (
        name: string,
        garmentId: string,
        defaultValue: boolean = false,
      ) => {
        // create a small hash id
        const hash = Math.random().toString(36).slice(2, 8);
        const nodeId = `elective-${hash}`;
        const node: ElectiveNode = {
          id: nodeId,
          type: "ELECTIVE",
          label: name,
          electiveId: hash,
          value: defaultValue,
          defaultValue: defaultValue,
          position: { x: 0, y: 0 },
        };

        graph.actions.addNode(node, {
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
        });
        markChanged();
      },
      removeElective: (nodeId: string) => {
        graph.actions.removeNode(nodeId);
        markChanged();
      },
      updateElective: (nodeId: string, changes: Partial<ElectiveNode>) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId];
        if (!curr) return;
        graph.actions.updateNode({ ...curr, ...changes } as any);
        markChanged();
      },
      addVisualization: (
        name: string,
        garmentId: string,
        materialNodeId: string,
        doms: VisualizationDom[],
      ) => {
        const hash = Math.random().toString(36).slice(2, 8);
        const nodeId = `visualization-${hash}`;
        const node = {
          id: nodeId,
          type: "VISUALIZATION",
          label: name,
          visualizationId: hash,
          materialNodeId,
          doms,
          position: { x: 0, y: 0 },
        } as any;

        graph.actions.addNode(node, {
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
        });

        // get material color
        const materialNode = graph.state?.nodes[materialNodeId] as MaterialNode;
        if (!materialNode) {
          console.error("Material node not found:", materialNodeId);
          return;
        }
        const material = getMaterials()[materialNode.materialId];
        const schema =
          materialTypes[material.type]?.schemas[material.schemaVersion];
        const colorAttr = Object.entries(schema.attributes).find(
          (entry) => entry[1] === "color",
        );

        if (!colorAttr) {
          console.error(
            "No color attribute found for material type:",
            material.type,
          );
          return;
        }
        const colorHex = material.attributes[colorAttr[0]].hex as string;
        for (const dom of doms) {
          let proxy: Partial<React.CSSProperties> = {};
          if (dom.fill) proxy.fill = colorHex;
          if (dom.stroke) proxy.stroke = colorHex;
          svg?.addProxy(dom.id, proxy);
        }
        markChanged();
      },
      removeVisualization: (nodeId: string) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId] as VisualizationNode;
        for (const dom of curr.doms) {
          svg?.deleteProxy(dom.id);
        }
        graph.actions.removeNode(nodeId);
        markChanged();
      },
      updateVisualization: (
        nodeId: string,
        changes: Partial<VisualizationNode>,
      ) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId] as VisualizationNode;
        if (!curr) return;
        const updatedNode = { ...curr, ...changes } as VisualizationNode;
        graph.actions.updateNode(updatedNode);

        if (!changes.doms && !changes.materialNodeId) return;
        if (
          curr.materialNodeId === updatedNode.materialNodeId &&
          curr.doms === updatedNode.doms
        )
          return;

        graph.actions.removeEdge(`${curr.materialNodeId}-${curr.id}`);
        graph.actions.removeEdge(`${curr.id}-${curr.materialNodeId}`);
        graph.actions.addEdge({
          id: `${updatedNode.materialNodeId}-${updatedNode.id}`,
          type: "HAS_VISUALIZATION",
          sourceId: updatedNode.materialNodeId,
          targetId: updatedNode.id,
        });
        graph.actions.addEdge({
          id: `${updatedNode.id}-${updatedNode.materialNodeId}`,
          type: "VISUALIZATION_OF",
          sourceId: updatedNode.id,
          targetId: updatedNode.materialNodeId,
        });

        const currMaterialNode = graph.state?.nodes[
          updatedNode.materialNodeId
        ] as MaterialNode;
        if (!currMaterialNode) {
          console.error("Material node not found:", curr.materialNodeId);
          return;
        }
        const currMaterial = getMaterials()[currMaterialNode.materialId];
        const schema =
          materialTypes[currMaterial.type]?.schemas[currMaterial.schemaVersion];
        const colorAttr = Object.entries(schema.attributes).find(
          (entry) => entry[1] === "color",
        );

        if (!colorAttr) {
          console.error(
            "No color attribute found for material type:",
            currMaterial.type,
          );
          return;
        }
        const colorHex = currMaterial.attributes[colorAttr[0]].hex as string;

        // remove all proxies for current doms
        for (const dom of curr.doms) {
          svg?.deleteProxy(dom.id);
        }

        for (const dom of updatedNode.doms) {
          const proxy: Partial<React.CSSProperties> = {};

          if (dom.fill) proxy.fill = colorHex;
          if (dom.stroke) proxy.stroke = colorHex;

          svg?.addProxy(dom.id, proxy);
        }
        markChanged();
      },
      updateMaterial: (nodeId: string, materialId: string) => {
        if (!graph.state) return;
        const newNode = {
          ...graph.state.nodes[nodeId],
          materialId,
        } as MaterialNode;
        graph.actions.updateNode(newNode);

        const material = getMaterials()[materialId];
        const schema =
          materialTypes[material.type]?.schemas[material.schemaVersion];
        const colorAttr = Object.entries(schema.attributes).find(
          (entry) => entry[1] === "color",
        );
        if (!colorAttr) return;
        const colorHex = material.attributes[colorAttr[0]].hex as string;
        const contrastColor = theme.palette.getContrastText(colorHex);
        const visualizationEdges = Object.values(graph.state.edges).filter(
          (edge) =>
            edge.type === "HAS_VISUALIZATION" && edge.sourceId === nodeId,
        );
        for (const edge of visualizationEdges) {
          const visualizationNode = graph.state?.nodes[
            edge.targetId
          ] as VisualizationNode;
          if (!visualizationNode) return;

          for (const dom of visualizationNode.doms) {
            const proxy: Partial<React.CSSProperties> = {};
            if (dom.fill) proxy.fill = colorHex;
            if (dom.stroke) proxy.stroke = colorHex;
            svg?.updateProxy(dom.id, proxy);
          }
        }
        markChanged();
      },
      /**
       * Add multiple graduations to a garment.
       * @param names Array of graduation names
       * @param garmentId ID of the garment part to add graduations to
       */
      addGraduations: (names: string[], garmentId: string) => {
        // compute next order index
        const graduationEdges = graph.state
          ? Object.values(graph.state.edges).filter(
              (e: any) =>
                e.sourceId === garmentId && e.type === "HAS_GRADUATION",
            )
          : [];
        const graduationNodes = graduationEdges.map((e: any) =>
          graph.state ? graph.state.nodes[e.targetId] : undefined,
        );
        const maxOrder = graduationNodes.reduce(
          (m: number, n: any) => Math.max(m, n?.order ?? 0),
          -1,
        );
        names.forEach((name, i) => {
          // Generate unique ID for each graduation
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
          graph.actions.addNode(node, {
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
          });
        });
        markChanged();
      },
      removeGraduation: (nodeId: string) => {
        if (!graph.state) {
          graph.actions.removeNode(nodeId);
          markChanged();
          return;
        }
        // sweep the graduation from every CONSUMES / CONSUMED_BY edge
        for (const edge of Object.values(graph.state.edges)) {
          if (edge.type !== "CONSUMES" && edge.type !== "CONSUMED_BY") continue;
          const e = edge as ConsumesEdge | ConsumedByEdge;
          if (!e.consumptionPerGrade?.[nodeId]) continue;
          const changes = dropGraduationFromEdge(e, nodeId);
          graph.actions.updateEdge<ConsumesEdge>(e.id, changes as any);
        }
        graph.actions.removeNode(nodeId);
        markChanged();
      },
      updateGraduation: (nodeId: string, changes: Partial<GraduationNode>) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId];
        if (!curr) return;
        graph.actions.updateNode({ ...curr, ...changes } as any);
        markChanged();
      },
      reorderGraduations: (graduationIds: string[]) => {
        // receives the new graduation order of node ids, where index 0 is the first graduation. Only update nodes that needs to be updated
        if (!graph.state) return;
        graduationIds.forEach((id, index) => {
          const node = graph.state!.nodes[id] as GraduationNode;
          if (node.order !== index) {
            graph.actions.updateNode({
              ...node,
              order: index,
            } as GraduationNode);
          }
        });
        markChanged();
      },
      addProcessMaterialConsumption: (
        processNodeId: string,
        materialNodeId: string,
        amount: CompoundValue,
      ) => {
        graph.actions.addEdge({
          id: `${processNodeId}->${materialNodeId}`,
          type: "CONSUMES",
          sourceId: processNodeId,
          targetId: materialNodeId,
          amount: amount,
        } as ConsumesEdge);
        graph.actions.addEdge({
          type: "CONSUMED_BY",
          id: `${materialNodeId}->${processNodeId}`,
          targetId: processNodeId,
          sourceId: materialNodeId,
          amount: amount,
        } as ConsumedByEdge);
        markChanged();
      },
      removeProcessMaterialConsumption: (
        processNodeId: string,
        materialNodeId: string,
      ) => {
        graph.actions.removeEdge(`${processNodeId}->${materialNodeId}`);
        graph.actions.removeEdge(`${materialNodeId}->${processNodeId}`);
        markChanged();
      },
      updateProcessMaterialConsumption: (
        processNodeId: string,
        materialNodeId: string,
        newAmount: CompoundValue,
      ) => {
        const forwardId = `${processNodeId}->${materialNodeId}`;
        const reverseId = `${materialNodeId}->${processNodeId}`;
        const forward = graph.state?.edges[forwardId] as
          | ConsumesEdge
          | undefined;
        const nextDeltas = recomputeAllGradeDeltas(
          newAmount,
          forward?.consumptionPerGrade,
        );
        graph.actions.updateEdge<ConsumesEdge>(forwardId, {
          amount: newAmount,
          gradeDeltas: nextDeltas,
        });
        graph.actions.updateEdge<ConsumedByEdge>(reverseId, {
          amount: newAmount,
          gradeDeltas: nextDeltas,
        });
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
        const forward = graph.state?.edges[forwardId] as
          | ConsumesEdge
          | undefined;
        if (!forward) return;
        const nextConsumption = {
          ...(forward.consumptionPerGrade ?? {}),
          [graduationId]: consumption,
        };
        const nextDeltas = {
          ...(forward.gradeDeltas ?? {}),
        };
        const delta = recomputeGradeDelta(forward.amount, consumption);
        if (delta !== undefined) nextDeltas[graduationId] = delta;
        else delete nextDeltas[graduationId];
        const changes = {
          consumptionPerGrade: nextConsumption,
          gradeDeltas:
            Object.keys(nextDeltas).length === 0 ? undefined : nextDeltas,
        };
        graph.actions.updateEdge<ConsumesEdge>(forwardId, changes);
        graph.actions.updateEdge<ConsumedByEdge>(reverseId, changes);
        markChanged();
      },
      clearProcessMaterialConsumptionForGraduation: (
        processNodeId: string,
        materialNodeId: string,
        graduationId: string,
      ) => {
        const forwardId = `${processNodeId}->${materialNodeId}`;
        const reverseId = `${materialNodeId}->${processNodeId}`;
        const forward = graph.state?.edges[forwardId] as
          | ConsumesEdge
          | undefined;
        if (!forward) return;
        const changes = dropGraduationFromEdge(forward, graduationId);
        if (Object.keys(changes).length === 0) return;
        graph.actions.updateEdge<ConsumesEdge>(forwardId, changes as any);
        graph.actions.updateEdge<ConsumedByEdge>(reverseId, changes as any);
        markChanged();
      },
      addProcess: (process: {
        name: string;
        costTime: CompoundValue;
        costMoney: CompoundValue;
      }) => {
        if (!graph.state) return;
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
        graph.actions.addNode(newNode, {
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
        } as EdgeMap);
        markChanged();
      },
      removeProcess: (nodeId: string) => {
        if (!graph.state) return;
        graph.actions.removeNode(nodeId);
        markChanged();
      },
      updateProcess: (nodeId: string, changes: Partial<ProcessNode>) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId];
        if (!curr) return;
        graph.actions.updateNode({ ...curr, ...changes } as any);
        markChanged();
      },
    },
  };
}
