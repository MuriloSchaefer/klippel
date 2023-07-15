import { IconButton } from "@mui/material";
import CheckSharpIcon from "@mui/icons-material/CheckSharp";

import { PointerContainerActionProps } from "@kernel/modules/Pointer/components/PointerContainer";

export interface ConfirmButtonProps extends PointerContainerActionProps {
  handleConfirm: () => void;
}

export const ConfirmAndCloseButton = ({
  closeContainer,
  handleConfirm,
}: ConfirmButtonProps) => {
  return (
    <IconButton
      color="success"
      key="accept"
      onClick={(e) => {
        handleConfirm();
        closeContainer && closeContainer(e);
      }}
      tabIndex={3}
    >
      <CheckSharpIcon />
    </IconButton>
  );
};
