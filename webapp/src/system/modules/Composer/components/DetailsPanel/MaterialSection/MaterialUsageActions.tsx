import { Box } from "@mui/material";
import RemoveMaterialButton from "./actions/RemoveMaterialButton";
import LinkMaterialButton from "./actions/LinkMaterialButton";
import AddRestrictionMaterialButton from "./actions/AddRestrictionMaterialButton";

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
      <AddRestrictionMaterialButton sx={{'hover': {color: 'yellow'}}}/>
    </Box>
  );
};

export default MaterialUsageActions;
