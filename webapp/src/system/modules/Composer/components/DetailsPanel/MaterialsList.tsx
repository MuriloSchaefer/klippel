import React from "react";

import List from "@mui/material/List";
import { Paper } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import MaterialItem from "./MaterialItem";
import { PartNode, CompositionEdge } from "../../store/graph/state";

export default function MaterialsList({
  selectedPart,
  graphId,
}: {
  selectedPart: string;
  graphId: string;
}) {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useNodeInfo } = graphModule.hooks;

  const {edges} = useNodeInfo<PartNode, CompositionEdge>(graphId, selectedPart)

  return (
    <List sx={{ width: "100%" }} role="material-list">
      {Object.values(edges).filter(e => e.type === 'MADE_OF').map(e => {
        return <Paper key={e.targetId} variant="outlined" square sx={{
          width: "100%", paddin: 1, '&:div + div': {
            borderTop: 0
          }
        }} role="material-container">
          <MaterialItem  graphId={graphId} nodeId={e.targetId}/>
        </Paper>
      })}
    </List>
  );
}