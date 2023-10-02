import { IconButtonProps } from "@mui/material";

import Box from '@mui/material/Box';

import RemoveProcessButton from "./RemoveProcessButton";
import ConfigureProcessButton from "./ConfigureProcess/Button";

export interface ProcessActionProps extends IconButtonProps {compositionName: string, processId: string}

const ProcessActions = (props: ProcessActionProps) => {
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
      <ConfigureProcessButton {...props} />
    </Box>
  );
};

export default ProcessActions;
