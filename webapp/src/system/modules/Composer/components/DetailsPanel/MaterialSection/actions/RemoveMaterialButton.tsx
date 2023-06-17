
import {  IconButton } from "@mui/material";
import { useCallback } from "react";
import useComposition from "../../../../hooks/useComposition";

import DeleteForeverSharpIcon from "@mui/icons-material/DeleteForeverSharp";

export const RemoveMaterialButton = ({compositionName, materialUsageId}: MaterialActionProps) => {
  const composition = useComposition(compositionName, c=>c)


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
