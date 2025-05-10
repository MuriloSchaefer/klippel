import { Typography } from "@mui/material";
import { useAppSelector } from "../hooks";
import { selectModuleState } from "../selectors";

export default function WorkspaceViewer() {
  const selectedWorkspace = useAppSelector(
    selectModuleState("Store", (s) => {
      return s?.selectedWorkspace;
    })
  );
  return <Typography>{selectedWorkspace}</Typography>;
}
