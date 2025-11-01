import { useCallback } from "react";

import IconButton from "@mui/material/IconButton";
import DeleteSharpIcon from "@mui/icons-material/DeleteSharp";

import { useTheme } from "@mui/material/styles";
import useVariation from "@system/modules/Composer/hooks/useVariation";

export const RemovePartButton = ({
  variationId,
  itemId,
}: {
  variationId: string;
  itemId: string;
}) => {
  const variation = useVariation({ variationId });
  const theme = useTheme();

  const handleRemoval = useCallback(() => {
    variation.actions.removePart(itemId);
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
