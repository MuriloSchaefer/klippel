import React from "react";

import List from "@mui/material/List";
import { Paper } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import { PartNode, CompositionEdge } from "../../store/composition/state";
import ProcessItem from "./ProcessItem";

export default function ProcessesList({
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
    <List sx={{ width: "100%" }} role="processes-list">
      {Object.values(edges).filter(e => e.type === 'PROCESS_NEEDED').map(e => {
        return <Paper key={e.targetId} variant="outlined" square sx={{
          width: "100%", padding: 1, '&:div + div': {
            borderTop: 0
          }
        }} role="process-container">
          <ProcessItem  graphId={graphId} nodeId={e.targetId}/>
        </Paper>
      })}
    </List>
  );
}
