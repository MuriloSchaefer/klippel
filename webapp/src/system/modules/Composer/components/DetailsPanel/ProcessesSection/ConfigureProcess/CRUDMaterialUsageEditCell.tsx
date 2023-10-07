import { useCallback } from "react";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select, { SelectChangeEvent } from "@mui/material/Select";
import { GridRenderEditCellParams, useGridApiContext } from "@mui/x-data-grid";

import useModule from "@kernel/hooks/useModule";
import type { IGraphModule } from "@kernel/modules/Graphs";
import type Edge from "@kernel/modules/Graphs/interfaces/Edge";
import type { EdgesHashMap, NodesHashMap } from "@kernel/modules/Graphs/store/state";

import type { CompositionNode } from "../../../../store/composition/state";

export const CRUDMaterialUsageEditCell = ({
  id,
  field,
  graphId,
  partId,
  value,
}: GridRenderEditCellParams & {
  graphId: string;
  partId: string;
  onChange?: (event: SelectChangeEvent) => void
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useGraph } = graphModule.hooks;
  const apiRef = useGridApiContext();

  const filterEdges = (edges: EdgesHashMap<Edge>) =>
    Object.values(edges).filter(
      (e) => e.type === "MADE_OF" && e.sourceId === partId
    );
  const getMaterialUsageNodes = (nodes: NodesHashMap<CompositionNode>, filter: string[])=> 
        Object.entries(nodes).reduce((acc, [id, node])=>{
            if (filter.includes(id)) return {...acc, [id]: node}
            return acc
        }, {})
  const {state} = useGraph<CompositionNode, {
    edges: Edge[],
    nodes: NodesHashMap<CompositionNode>
  }>(graphId, (g) => g && {
    edges: filterEdges(g.edges),
    nodes: getMaterialUsageNodes(g.nodes, filterEdges(g.edges).map(e => e.targetId))
  });
  

  const handleMaterialChange = useCallback(
    (event: SelectChangeEvent) => {
      apiRef.current.setEditCellValue({
        id, field, value: event.target.value
      })
    }, //composition.actions.changeMaterial(node.id, materialId),
    [graphId, partId]
  );

  if (!state) return <></>; // TODO: add loading

  return (
    <FormControl
      sx={{ m: 1, minWidth: 120, width: "min-content" }}
      
      size="small"
    >
      <InputLabel id={`label`}>Material</InputLabel>
      <Select
        labelId={`label`}
        id={`material-type`}
        value={value ?? ""}
        label="Material"
        autoWidth={true}
        onChange={handleMaterialChange}
      >
        {state.edges.map((e) => (
          <MenuItem key={e.id} value={e.targetId}>
            {state.nodes[e.targetId].label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};

export default CRUDMaterialUsageEditCell;
