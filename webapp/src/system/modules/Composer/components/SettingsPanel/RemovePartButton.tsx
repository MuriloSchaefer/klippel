
import IconButton from "@mui/material/IconButton";

import DeleteForeverSharpIcon from '@mui/icons-material/DeleteForeverSharp';
import { MouseEvent, useCallback } from "react";
import useComposition from "../../hooks/useComposition";
import { useTheme } from "@mui/material/styles";


export const RemovePartButton = ({
  compositionName,
  nodeId
}: {
  compositionName: string;
  nodeId: string;
}) => {
  const composition = useComposition({compositionName}, (c) => c);
  const theme = useTheme()

  const handleSubmit = useCallback((e: MouseEvent) => {
    //composition.actions.addPart(form.name, form.domId, composition.state);
    if (composition.state) {
      composition.actions.removePart(nodeId)
    }
    e.stopPropagation();
  }, [composition, nodeId]);

  return (
    <IconButton
        aria-label="Delete part"
        id={`delete-part-${nodeId}`}
        role='delete-part-button'
        size="small"
        sx={{ color:  theme.palette.error.dark}}
        onClick={handleSubmit}
      >
        <DeleteForeverSharpIcon />
      </IconButton>
  );
};

export default RemovePartButton;
