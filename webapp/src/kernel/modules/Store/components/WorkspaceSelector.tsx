import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import { Box, Divider, FormControl, InputLabel } from "@mui/material";

import { useAppDispatch, useAppSelector, useCurrentWorkspace } from "../hooks";
import { selectModuleState } from "../selectors";
import { selectWorkspace } from "../actions";
import { NewWorkspaceButton } from "./NewWorkspaceButton";

export default function WorkspaceSelector() {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useCurrentWorkspace()
  const workspaces = useAppSelector<string[]>(
    selectModuleState("Store", (s) => {
      return s?.workspaces;
    })
  );
  return (
    <Box sx={{display: 'flex'}}>
      <FormControl variant="standard" sx={{ minWidth: 120 }}>
      <InputLabel id="workspace-selector-label">Área de trabalho</InputLabel>
      <Select
        id="workspace-selector"
        labelId="workspace-selector-label"
        value={selectedWorkspace}
        onChange={(event) =>
          dispatch(selectWorkspace({ workspace: event.target.value }))
        }
        label="Área de trabalho"
        size="small"
      >
        {workspaces.map((ws) => (
          <MenuItem value={ws} key={ws}>{ws}</MenuItem>
        ))}
      </Select>
    </FormControl>
      <NewWorkspaceButton />
      <Divider orientation="vertical" flexItem/>
    </Box>
  );
}
