
import { useCallback } from "react";

import IconButton from "@mui/material/IconButton";
import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";

import useComposition from "../../../../hooks/useComposition";
import { MaterialActionProps } from "./types";

export const RemoveMaterialButton = ({compositionName, materialUsageId}: MaterialActionProps) => {
  const composition = useComposition({compositionName}, c=>c)


  const handleDelete = useCallback(() => {
    composition.actions.removeMaterialUsage(materialUsageId);
  }, [composition]);

  return (
    <IconButton
      color="error"
      key="delete"
      id="delete-material"
      onClick={handleDelete}
      sx={{ flexGrow: 2 }}
    >
      <DeleteForeverSharpIcon />
    </IconButton>
  );
};

export default RemoveMaterialButton;
