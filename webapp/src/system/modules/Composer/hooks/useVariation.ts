import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Store } from "@kernel/modules/Store";
import { selectPart } from "../store/variations/actions";
import { ComposerModuleState, MaterialNode, PartNode, ElectiveNode } from "../typings";
import { EdgeMap } from "@kernel/modules/Graphs/hooks/useGraph";
import { IMaterialsModule } from "@system/modules/Materials";

export default function useVariation({ variationId }: { variationId: string }) {
  const storeModule = useModule<Store>("Store");
  const materialsModule = useModule<IMaterialsModule>("Materials");
  const dispatch = storeModule.hooks.useAppDispatch();
  const useAppSelector = storeModule.hooks.useAppSelector;

  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;
  const { useMaterials} = materialsModule.hooks;

  const materials = useMaterials();

  const state = useAppSelector(
    (state: { Composer: ComposerModuleState }) => state.Composer.variations[variationId]
  );
  const graph = useGraph(variationId, (g) => g);
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
      addMaterial: (materialId: number) => {
        const material = materials[materialId];
        if (!material) {
          console.error("Material not found:", materialId);
          return;
        }
        const nodeId = `material-${materialId}`
        const node: MaterialNode = {
          id: nodeId,
          type: "MATERIAL",
          label: `Material ${materialId}`,
          materialId: materialId,
          position: { x: 0, y: 0 },
        };
        graph.actions.addNode(node, {
          inputs: {
            [`garment-${nodeId}`]: {
              id: `garment-${nodeId}`,
              type: "HAS_MATERIAL",
              sourceId: 'garment',
              targetId: nodeId,
            },
          },
          outputs: {
            [`${nodeId}-garment`]: {
              id: `${nodeId}-garment`,
              type: "MATERIAL_OF",
              sourceId: nodeId,
              targetId: 'garment',
            },
          },
        });
      },
      removeMaterial: (materialId: number) => {
        const nodeId = `material-${materialId}`;
        graph.actions.removeNode(nodeId);
      },
      addElective: (name: string, garmentId: string, defaultValue: boolean = false) => {
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
      updateMaterial: (nodeId: string, materialId: number)=>{
        if (!graph.state) return
        const oldNode = graph.state.nodes[nodeId]
        const inputEdges = Object.values(graph.state.edges).filter((edge)=>edge.targetId === oldNode.id)
        const outputEdges = Object.values(graph.state.edges).filter((edge)=>edge.sourceId === oldNode.id)
        const newNode = {...graph.state.nodes[nodeId], materialId, id: `material-${materialId}`} as MaterialNode
        
        if (newNode.id in graph.state.nodes){
          // TODO: update curr node to merge old material
          inputEdges.forEach(edge => {
            if (! graph.state) return
            const newEdgeId = `${edge.sourceId}-${newNode.id}`
            if ( newEdgeId in graph.state.edges){
              // ignore. TODO: merge attributes (such as materialUsage and so on)
              console.log(`ignoring edge ${newEdgeId}. Already exists`)
              return
            }
            graph.actions.addEdge({...edge, id: newEdgeId, targetId: newNode.id})
          })
          outputEdges.forEach(edge => {
            if (! graph.state) return
            const newEdgeId = `${newNode.id}-${edge.targetId}`
            if ( newEdgeId in graph.state.edges){
              // ignore. TODO: merge attributes (such as materialUsage and so on)
              console.log(`ignoring edge ${newEdgeId}. Already exists`)
              return
            }
            graph.actions.addEdge({...edge, id: newEdgeId, sourceId: newNode.id})
          })
        } else {
          graph.actions.addNode(newNode, {
            inputs: inputEdges.reduce((edges, currEdge) => ({...edges, [`${currEdge.sourceId}-${newNode.id}`]: {...currEdge, targetId: newNode.id}}), {}),
            outputs: outputEdges.reduce((edges, currEdge) => ({...edges, [`${newNode.id}-${currEdge.targetId}`]: {...currEdge, sourceId: newNode.id}}), {}),
          });
        }
        graph.actions.removeNode(nodeId)
      
      }
    },
  };
}
