import { Box } from "@mui/material";
import RemoveMaterialButton from "./RemoveMaterialButton";
import ConfigureMaterialButton from "./ConfigureMaterialButton";

const MaterialUsageActions = (props: {compositionName: string, materialUsageId: string}) => {
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
      <ConfigureMaterialButton />
    </Box>
  );
};

export default MaterialUsageActions;
