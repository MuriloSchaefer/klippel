import List from "@mui/material/List";
import { Paper } from "@mui/material";

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import { PartNode, CompositionEdge } from "../../../store/composition/state";
import ProcessItem from "./ProcessItem";
import AddProcessButton from "./AddProcessButton";
import ProcessActions from "./ProcessActions";

export default function ProcessesList({
  compositionName,
  selectedPart,
  graphId,
}: {
  compositionName: string;
  selectedPart: string;
  graphId: string;
}) {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useNodeInfo } = graphModule.hooks;

  const { edges } = useNodeInfo<PartNode, CompositionEdge>(
    graphId,
    selectedPart
  );

  return (
    <List sx={{ width: "100%" }} role="processes-list">
      <AddProcessButton compositionName={compositionName} />
      {Object.values(edges)
        .filter((e) => e.type === "PROCESS_NEEDED")
        .map((e) => {
          return (
            <Paper
              key={e.targetId}
              variant="outlined"
              square
              sx={{
                width: "100%",
                padding: 1,
                "&:div + div": {
                  borderTop: 0,
                },
                display: 'flex',
              }}
              role="process-container"
            >
              <ProcessItem graphId={graphId} nodeId={e.targetId} />
              <ProcessActions
                compositionName={compositionName}
                processId={e.targetId}
              />
            </Paper>
          );
        })}
    </List>
  );
}
