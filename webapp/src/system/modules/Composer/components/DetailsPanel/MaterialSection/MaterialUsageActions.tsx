import { Box, IconButton } from "@mui/material";

import TuneSharpIcon from "@mui/icons-material/TuneSharp";
import RemoveMaterialButton from "./RemoveMaterialButton";

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
      <IconButton color="default" key="configure" id="configure-material" sx={{flexGrow: 2}}>
        <TuneSharpIcon />
      </IconButton>
    </Box>
  );
};

export default MaterialUsageActions;
