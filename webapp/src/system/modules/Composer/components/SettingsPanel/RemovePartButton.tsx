
import IconButton from "@mui/material/IconButton";

import DeleteForeverSharpIcon from '@mui/icons-material/DeleteForeverSharp';
import { MouseEvent, useCallback } from "react";
import useComposition from "../../hooks/useComposition";


export const RemovePartButton = ({
  compositionName
}: {
  compositionName: string;
}) => {
  const composition = useComposition({compositionName}, (c) => c?.selectedPart);

  const handleSubmit = useCallback((e: MouseEvent) => {
    //composition.actions.addPart(form.name, form.domId, composition.state);
    if (composition.state) {
      composition.actions.removePart(composition.state)
    }
    e.stopPropagation();
  }, [composition]);

  return (
    <IconButton
        aria-label="Delete part"
        id={`delete-part-${composition.state}`}
        role='delete-part-button'
        size="small"
        sx={{ }}
        onClick={handleSubmit}
      >
        <DeleteForeverSharpIcon />
      </IconButton>
  );
};

export default RemovePartButton;
