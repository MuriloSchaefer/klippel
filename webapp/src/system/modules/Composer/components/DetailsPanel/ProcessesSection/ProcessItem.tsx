
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import Typography from '@mui/material/Typography';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";
import AttachMoneySharpIcon from "@mui/icons-material/AttachMoneySharp";


import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import { OperationNode } from "../../../store/composition/state";

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
        primary={
          <Box>
            <Typography variant="h6" sx={{ fontWeight: "bold" }}>
              {node.label}
            </Typography>
            <Divider />
          </Box>
        }
        secondary={
          <Typography component="div" sx={{ padding: 1 }}>
            <Box
              sx={{
                display: "flex",
                justifyContent: "space-between",
              }}
              role="material-attributes"
              aria-label="material attributes"
            >
              <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
                <AccessTimeSharpIcon /> {node.time_taken.quotient.amount}{" "}
                {node.time_taken.quotient.unit} /{" "}
                {node.time_taken.dividend.amount}{" "}
                {node.time_taken.dividend.unit}
              </Box>
              <Box sx={{ display: "flex", gap: 0.3, alignItems: "center" }}>
                <AttachMoneySharpIcon /> {node.cost.quotient.amount}{" "}
                {node.cost.quotient.unit} / {node.cost.dividend.amount}{" "}
                {node.cost.dividend.unit}
              </Box>
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default ProcessItem;
