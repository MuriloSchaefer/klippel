
import Box from '@mui/material/Box';
import ListItem from '@mui/material/ListItem';
import Typography from '@mui/material/Typography';
import ListItemText from '@mui/material/ListItemText';
import Divider from '@mui/material/Divider';

import useModule from "@kernel/hooks/useModule";
import { IGraphModule } from "@kernel/modules/Graphs";

import { MaterialUsageNode } from "../../../store/composition/state";
import MaterialSelector from "../../editableFields/MaterialSelector";
import MaterialTypeSelector from "../../editableFields/MaterialTypeSelector";


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
    <ListItem role="material-info">
      <ListItemText
        disableTypography={true}
        primary={
          <Box sx={{marginBottom:1}}>
            <Typography>
              {node.label}
            </Typography>
            <Divider />
          </Box>}
        secondary={
          <Typography component="div">
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <Box
                sx={{
                  gap: 1,
                  display: "flex",
                  flexWrap: "wrap",
                  flexDirection: "row",
                }}
                role="material-attributes"
                aria-label="material attributes"
              >
                {node.editableAttributes.map((field) => {
                  switch (field) {
                    case "materialType":
                      return (
                        <MaterialTypeSelector
                          key={field}
                          graphId={graphId}
                          node={node}
                        />
                      );
                    case "materialId":
                      return (
                        <MaterialSelector
                          key={field}
                          graphId={graphId}
                          node={node}
                        />
                      );
                    default:
                      return <>error</>;
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
