import { Box } from "@mui/material";
import RemoveMaterialButton from "./actions/RemoveMaterialButton";
import LinkMaterialButton from "./actions/LinkMaterialButton";
import AddRestrictionButton from "./actions/RestrictionsManagement/Button";
import { MaterialActionProps } from "./actions/types";

const MaterialUsageActions = (props: MaterialActionProps) => {
  return (
    <Box
      sx={{
        display: "flex",
        flexDirection: "column",
        padding: 0,
        justifyContent: "space-around",
        alignContent: "space-evenly",
        
      }}
      role="actions"
    >
      <RemoveMaterialButton {...props}/>
      <LinkMaterialButton {...props}/>
      <AddRestrictionButton {...props} sx={{'hover': {fill: 'yellow'}}}/>
    </Box>
  );
};

export default MaterialUsageActions;
