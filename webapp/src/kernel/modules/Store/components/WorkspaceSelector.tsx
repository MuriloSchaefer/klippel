import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";

import { useAppDispatch, useAppSelector, useCurrentWorkspace } from "../hooks";
import { selectModuleState } from "../selectors";
import { selectWorkspace } from "../actions";
import { FormControl, InputLabel } from "@mui/material";

export default function WorkspaceSelector() {
  const dispatch = useAppDispatch();
  const selectedWorkspace = useCurrentWorkspace()
  const workspaces = useAppSelector<string[]>(
    selectModuleState("Store", (s) => {
      return s?.workspaces;
    })
  );
  return (
    <FormControl variant="standard" sx={{ minWidth: 120 }}>
      <InputLabel id="workspace-selector-label">Workspace</InputLabel>
      <Select
        id="workspace-selector"
        labelId="workspace-selector-label"
        value={selectedWorkspace}
        onChange={(event) =>
          dispatch(selectWorkspace({ workspace: event.target.value }))
        }
        label="Workspace"
        size="small"
      >
        {workspaces.map((ws) => (
          <MenuItem value={ws}>{ws}</MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
