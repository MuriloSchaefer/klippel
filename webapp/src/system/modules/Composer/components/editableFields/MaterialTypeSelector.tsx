import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { IMaterialsModule } from "@system/modules/Materials";
import { useCallback, useMemo } from "react";
import {
  CompositionEdge,
  CompositionNode,
  MaterialTypeNode,
  MaterialUsageNode,
  RestrictedByEdge,
  RestrictionNode,
} from "../../store/graph/state";

const MaterialTypeSelector = ({ node, graphId }: {node: MaterialUsageNode, graphId: string}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const {components: {MaterialTypeSelector}} = useModule<IMaterialsModule>('Materials')

  const { useNodeInfo, useGraph, useSearchResult } = graphModule.hooks;
  const graph = useGraph<MaterialUsageNode, CompositionEdge>(
    graphId,
    (g) => g?.nodes[node.id]
  );
  
  // Get all restrictions for node
  const searchResultPath = useMemo(
    () =>{
        return graph.actions.search(
            "bfs",
            node.id,
            (n, g) => {
              if (n.type !== 'RESTRICTION') return false
              const neighbours = g.adjacencyList[n.id]
              const result = neighbours.inputs.some((neighbour) => {
                const edge = g.edges[neighbour] as CompositionEdge

                return edge.type === 'RESTRICTED_BY' && edge.attr === 'materialType'
              })
              return result
            },
            () => false, // stops only when checked all neighbours
            1, // search only neighbours
            `Get all restriction associated with ${node.label}`
          )
    },
    [graphId]
  );
  const restrictions = useSearchResult<RestrictionNode>(graphId, searchResultPath);
  const filterOptions = restrictions?.findings.reduce((allowed, restriction)=>{
    if ('allowOnly' in restriction) return [...allowed, ...restriction.allowOnly]
    return allowed
  }, [] as string[])

  const materialTypeNode = useNodeInfo<MaterialTypeNode>(
    graphId,
    node.materialType
  ); 

  const handleChange = useCallback((value:string)=>{
    // TODO: check if material type node is available first
    graph.actions.updateNode({...node, materialType: value})
  }, [graph])

  return <MaterialTypeSelector filter={(type) => filterOptions?.includes(type.name) ?? true} value={materialTypeNode.node.id} onChange={handleChange}/>
};

export default MaterialTypeSelector;
