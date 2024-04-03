
import IconButton from "@mui/material/IconButton";
import { useCallback } from "react";
import useComposition from "../../../hooks/useComposition";

import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";

export const RemoveProcessButton = ({compositionName, processId}: {compositionName: string, processId: string}) => {
  const composition = useComposition({compositionName}, c=>c)


  const handleDelete = useCallback(() => {
    composition.actions.removeOperation(processId);
  }, [composition]);

  return (
    <IconButton
      color="error"
      key="delete"
      id={`delete-process-${processId}`}
      onClick={handleDelete}
      sx={{ flexGrow: 2 }}
    >
      <DeleteForeverSharpIcon />
    </IconButton>
  );
};

export default RemoveProcessButton;
