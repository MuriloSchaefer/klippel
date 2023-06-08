import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Box, ListItem, ListItemText, Typography } from "@mui/material";
import { OperationNode } from "../../../store/composition/state";

import AccessTimeSharpIcon from '@mui/icons-material/AccessTimeSharp';
import AttachMoneySharpIcon from '@mui/icons-material/AttachMoneySharp';

const ProcessItem = ({
  graphId,
  nodeId,
}: {
  graphId: string;
  nodeId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useNodeInfo } = graphModule.hooks;

  const { node } = useNodeInfo<OperationNode>(graphId, nodeId);

  return (
    <ListItem>
      <ListItemText
        disableTypography={true}
        primary={<Typography component="div">{node.label}</Typography>}
        secondary={
          <Typography component="div">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box sx={{gap:1, display:'flex', flexWrap:'wrap', flexDirection:'row'}} role="material-attributes" aria-label="material attributes">
                  <AccessTimeSharpIcon /> {node.time_taken.amount} {node.time_taken.unit}
                  <AttachMoneySharpIcon /> {node.cost.amount} {node.cost.unit} {'by' in node.cost && `/ ${node.cost.by}`}
              </Box>
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default ProcessItem;
