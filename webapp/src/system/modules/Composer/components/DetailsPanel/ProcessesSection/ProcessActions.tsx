import { Box, IconButton } from "@mui/material";

import TuneSharpIcon from "@mui/icons-material/TuneSharp";
import RemoveProcessButton from "./RemoveProcessButton";

const ProcessActions = (props: {compositionName: string, processId: string}) => {
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
      <RemoveProcessButton {...props}/>
      <IconButton color="default" key="configure" id="configure-material" sx={{flexGrow: 2}}>
        <TuneSharpIcon />
      </IconButton>
    </Box>
  );
};

export default ProcessActions;
