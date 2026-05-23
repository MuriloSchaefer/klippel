import { useCallback } from "react";

import IconButton from "@mui/material/IconButton";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";

import { useTheme } from "@mui/material/styles";
import { useVariationActions } from "@system/modules/Composer/hooks/useVariationActions";

export const RemovePartButton = ({
  variationId,
  itemId,
}: {
  variationId: string;
  itemId: string;
}) => {
  const { actions } = useVariationActions({ variationId });
  const theme = useTheme();

  const handleRemoval = useCallback(() => {
    actions.removePart(itemId);
  }, []);

  return (
    <IconButton
      aria-label="Add new part"
      size="small"
      sx={{ lineHeight: "0.3em", color: theme.palette.success.dark }}
      onClick={(e) => {
        handleRemoval();
        e.stopPropagation();
      }}
    >
      <DeleteSharpIcon />
    </IconButton>
  );
};

export default RemovePartButton;
