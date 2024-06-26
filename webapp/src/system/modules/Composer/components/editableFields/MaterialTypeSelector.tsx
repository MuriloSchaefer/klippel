import { useCallback, useMemo } from "react";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import type { IMaterialsModule } from "@system/modules/Materials";

import useComposition from "../../hooks/useComposition";
import {
  CompositionEdge,
  CompositionGraph,
  CompositionNode,
  MaterialTypeNode,
  MaterialUsageNode,
  RestrictionNode,
} from "../../store/composition/state";
import type { SelectChangeEvent } from "@mui/material";
import _ from "lodash";

const MaterialTypeSelector = ({
  node,
  graphId,
}: {
  node: MaterialUsageNode;
  graphId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const {
    components: { MaterialTypeSelector },
  } = useModule<IMaterialsModule>("Materials");

  const { useNodeInfo, useGraph, useSearch } = graphModule.hooks;
  const graph = useGraph<CompositionGraph, CompositionNode | undefined>(
    graphId,
    (g) => g?.nodes[node.id] as CompositionNode
  );

  const searchId = useMemo(()=> `${node.id}/materialType/restrictions`, [node?.id])

  const restrictions = useSearch<RestrictionNode>(graphId, searchId, ()=>{
    if (!node) return
    graph.actions.search(
      "bfs",
      node.id,
      (n, g) => {
        if (n.type !== "RESTRICTION") return false;
        const neighbours = g.adjacencyList[n.id];
        const result = neighbours.inputs.some((neighbour) => {
          const edge = g.edges[neighbour] as CompositionEdge;

          return edge.type === "RESTRICTED_BY" && edge.attr === "materialType";
        });
        return result;
      },
      () => false, // stops only when checked all neighbours,
      (node, graph) => {
        // get neighbours
        const links = [...graph.adjacencyList[node.id].inputs, ...graph.adjacencyList[node.id].outputs]
        return Object.values(graph.edges).filter(e => links.includes(e.id)).map(e => e.targetId)
      },
      1, // search only neighbours
      `Get all restriction associated with ${node.label}`,
      searchId
    );
  })

  const filterOptions = useMemo(()=>restrictions?.findings.reduce(
    (allowed, restriction) => {
      if (restriction.restrictionType === "allowOnly")
        return [...allowed, ...restriction.operand];
      return allowed;
    },
    [] as string[]
  ), [restrictions])

  const materialTypeNode = useNodeInfo<MaterialTypeNode>(
    graphId,
    node.materialType
  );

  const composition = useComposition({compositionName: graphId}, (c) => c); // QUESTION: what if graphId != composition name?

  const handleMaterialTypeChange = useCallback(
    (event: SelectChangeEvent) =>
      composition.actions.changeMaterialType(node.id, event.target.value),
    [graphId, node.id]
  );

  return (
    <MaterialTypeSelector
      filter={(type) =>
        restrictions?.findings.length
          ? filterOptions?.includes(type.name)
          : true
      }
      value={materialTypeNode.node?.id}
      onChange={handleMaterialTypeChange}
    />
  );
};

export default MaterialTypeSelector;
