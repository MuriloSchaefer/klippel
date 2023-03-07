import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";
import { Box, ListItem, ListItemText, Typography } from "@mui/material";
import { MaterialUsageNode } from "../../store/graph/state";
import MaterialSelector from "../editableFields/MaterialSelector";
import MaterialTypeSelector from "../editableFields/MaterialTypeSelector";

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
              <Box sx={{gap:1, display:'flex', flexWrap:'wrap', flexDirection:'row'}} role="material-attributes" aria-label="material attributes">
                  {node.editableAttributes.map(field => {
                      switch (field) {
                          case "materialType": return <MaterialTypeSelector key={field} graphId={graphId} node={node} />
                          case "material": return <MaterialSelector key={field} graphId={graphId} node={node}/>
                          default: return <>error</>
                      }
                  })}
              </Box>
            </Box>
          </Typography>
        }
      />
    </ListItem>
  );
};

export default MaterialItem;
