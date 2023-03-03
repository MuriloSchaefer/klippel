import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { FormControl, InputLabel, Select, MenuItem } from "@mui/material";
import { useMemo } from "react";
import { FieldProps } from ".";
import {
  CompositionEdge,
  MaterialTypeNode,
  MaterialUsageNode,
  RestrictedByEdge,
} from "../../store/graph/state";

const MaterialTypeSelector = ({ node, graphId }: FieldProps) => {
  const graphModule = useModule<IGraphModule>("Graph");

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
    []
  );
  const result = useSearchResult(graphId, searchResultPath);
  // const restrictions = result?.findings.reduce((acc, curr)=> ({...acc, }), {})

  const materialTypeNode = useNodeInfo<MaterialTypeNode>(
    graphId,
    node.materialType
  );

  return (
    <FormControl sx={{ m: 1, minWidth: 120 }} fullWidth size="small">
      <InputLabel id={`${node.id}-material-type-label`}>Tipo</InputLabel>
      <Select
        labelId={`${node.id}-material-type-label`}
        id={`${node.id}-material-type-label`}
        value={node.materialType}
        label={materialTypeNode.node.label}
      >
        <MenuItem value={node.materialType}>{materialTypeNode.node.label}</MenuItem>
        {/* {availableOptions.map(option => {
                const label = interpreter.any(SELF(option.replace('_:#', '')), RDF('label'), undefined)
                return <MenuItem value={option}>{label?.value}</MenuItem>
            })} */}
      </Select>
    </FormControl>
  );
};

export default MaterialTypeSelector;
