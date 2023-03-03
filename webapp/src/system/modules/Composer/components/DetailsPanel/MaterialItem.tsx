import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Box, ListItem, ListItemText, Typography } from "@mui/material";
import { MaterialUsageNode } from "../../store/graph/state";
import EditableFields from "../editableFields";

const MaterialItem = ({
  graphId,
  nodeId,
}: {
  graphId: string;
  nodeId: string;
}) => {
  const graphModule = useModule<IGraphModule>("Graph");
  const { useNodeInfo } = graphModule.hooks;

  const { node } = useNodeInfo<MaterialUsageNode>(graphId, nodeId);

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
              <EditableFields node={node} graphId={graphId} />
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default MaterialItem;
