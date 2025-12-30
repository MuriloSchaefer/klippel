import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Store } from "@kernel/modules/Store";
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

export default function useVariation({ variationId }: { variationId: string }) {
  const theme = useTheme();
  const storeModule = useModule<Store>("Store");
  const svgModule = useModule<ISVGModule>("SVG");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const dispatch = storeModule.hooks.useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;
  const { useMaterials, useMaterialTypes } = materialsModule.hooks;

  const materials = useMaterials();
  const materialTypes = useMaterialTypes();

  const state = useAppSelector(
    (state: { Composer: ComposerModuleState }) =>
      state.Composer.variations[variationId]
  );
  const graph = useGraph(variationId, (g) => g);
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
      },
      removePart: (partId: string) => graph.actions.removeNode(partId),
      addMaterial: (
        materialId: number,
        label: string,
        typeRestrictions: string[]
      ) => {
        const material = materials[materialId];
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
      },
      removeMaterial: (materialId: number) => {
        const nodeId = Object.values(graph.state?.nodes ?? {}).find(
          (n) =>
            n.type === "MATERIAL" &&
            (n as MaterialNode).materialId === materialId
        )?.id;
        if (!nodeId) {
          console.error("Material node not found for materialId:", materialId);
          return;
        }
        graph.actions.removeNode(nodeId);
      },
      addElective: (
        name: string,
        garmentId: string,
        defaultValue: boolean = false
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
      },
      removeElective: (nodeId: string) => {
        graph.actions.removeNode(nodeId);
      },
      updateElective: (nodeId: string, changes: Partial<ElectiveNode>) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId];
        if (!curr) return;
        graph.actions.updateNode({ ...curr, ...changes } as any);
      },
      addVisualization: (
        name: string,
        garmentId: string,
        materialNodeId: string,
        doms: VisualizationDom[]
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
        const material = materials[materialNode.materialId];
        const schema =
          materialTypes[material.type]?.schemas[material.schemaVersion];
        const colorAttr = Object.entries(schema.attributes).find(
          (entry) => entry[1] === "color"
        );

        if (!colorAttr) {
          console.error(
            "No color attribute found for material type:",
            material.type
          );
          return;
        }
        const colorHex = material.attributes[colorAttr[0]].hex as string;
        for (const dom of doms) {
          const proxy = {
            fill: dom.fill ? colorHex : undefined,
            stroke: dom.stroke ? colorHex : undefined,
          };
          svg?.addProxy(dom.id, proxy);
        }
      },
      removeVisualization: (nodeId: string) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId] as VisualizationNode;
        for (const dom of curr.doms) {
          svg?.deleteProxy(dom.id);
        }
        graph.actions.removeNode(nodeId);
      },
      updateVisualization: (
        nodeId: string,
        changes: Partial<VisualizationNode>
      ) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId] as VisualizationNode;
        if (!curr) return;
        const updatedNode = { ...curr, ...changes } as VisualizationNode;
        graph.actions.updateNode(updatedNode);

        if (!changes.doms && !changes.materialNodeId) return;
        if (curr.materialNodeId === updatedNode.materialNodeId) return;

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
        const currMaterial = materials[currMaterialNode.materialId];
        const schema =
          materialTypes[currMaterial.type]?.schemas[currMaterial.schemaVersion];
        const colorAttr = Object.entries(schema.attributes).find(
          (entry) => entry[1] === "color"
        );

        if (!colorAttr) {
          console.error(
            "No color attribute found for material type:",
            currMaterial.type
          );
          return;
        }
        const colorHex = currMaterial.attributes[colorAttr[0]].hex as string;

        // remove all proxies for current doms
        for (const dom of curr.doms) {
          svg?.deleteProxy(dom.id);
        }

        for (const dom of updatedNode.doms) {
          const proxy = {
            fill: dom.fill ? colorHex : undefined,
            stroke: dom.stroke ? colorHex : undefined,
          };

          svg?.addProxy(dom.id, proxy);
        }
      },
      updateMaterial: (nodeId: string, materialId: number) => {
        if (!graph.state) return;
        const newNode = {
          ...graph.state.nodes[nodeId],
          materialId,
        } as MaterialNode;
        graph.actions.updateNode(newNode);

        const material = materials[materialId];
        const schema =
          materialTypes[material.type]?.schemas[material.schemaVersion];
        const colorAttr = Object.entries(schema.attributes).find(
          (entry) => entry[1] === "color"
        );
        if (!colorAttr) return;
        const colorHex = material.attributes[colorAttr[0]].hex as string;
        const contrastColor = theme.palette.getContrastText(colorHex);
        const visualizationEdges = Object.values(graph.state.edges).filter(
          (edge) =>
            edge.type === "HAS_VISUALIZATION" && edge.sourceId === nodeId
        );
        for (const edge of visualizationEdges) {
          const visualizationNode = graph.state?.nodes[
            edge.targetId
          ] as VisualizationNode;
          if (!visualizationNode) return;

          for (const dom of visualizationNode.doms) {
            const proxy = {
              fill: dom.fill ? colorHex : undefined,
              stroke: dom.stroke ? colorHex : contrastColor,
            };
            svg?.updateProxy(dom.id, proxy);
          }
        }
      },
      addGraduations: (names: string[], garmentId: string) => {
        const hash = Math.random().toString(36).slice(2, 8);
        const nodeId = `graduation-${hash}`;

        // compute next order index
        const graduationEdges = graph.state
          ? Object.values(graph.state.edges).filter(
              (e: any) =>
                e.sourceId === garmentId && e.type === "HAS_GRADUATION"
            )
          : [];
        const graduationNodes = graduationEdges.map((e: any) =>
          graph.state ? graph.state.nodes[e.targetId] : undefined
        );
        const maxOrder = graduationNodes.reduce(
          (m: number, n: any) => Math.max(m, n?.order ?? 0),
          -1
        );
        names.forEach((name, i) => {
          const node: GraduationNode = {
            id: nodeId,
            type: "GRADUATION",
            label: name,
            graduationId: hash,
            order: maxOrder + i + 1,
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
      },
      removeGraduation: (nodeId: string) => {
        // update orders of other graduations

        graph.actions.removeNode(nodeId);
      },
      updateGraduation: (nodeId: string, changes: Partial<GraduationNode>) => {
        if (!graph.state) return;
        const curr = graph.state.nodes[nodeId];
        if (!curr) return;
        graph.actions.updateNode({ ...curr, ...changes } as any);
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
      },
      addProcessMaterialConsumption: (processNodeId: string, materialNodeId: string, amount: CompoundValue)=>{
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
      },
      removeProcessMaterialConsumption: (
        processNodeId: string, materialNodeId: string
      )=>{
        graph.actions.removeEdge(`${processNodeId}->${materialNodeId}`)
        graph.actions.removeEdge(`${materialNodeId}->${processNodeId}`)
      },
      updateProcessMaterialConsumption: (processNodeId: string, materialNodeId: string, newAmount: CompoundValue)=>{
        graph.actions.updateEdge<ConsumesEdge>(`${processNodeId}->${materialNodeId}`, {amount: newAmount})
        graph.actions.updateEdge<ConsumedByEdge>(`${materialNodeId}->${processNodeId}`, {amount: newAmount})
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
      },
    },
  };
}
