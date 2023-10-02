import IconButton from "@mui/material/IconButton";
import CheckSharpIcon from "@mui/icons-material/CheckSharp";

import { PointerContainerActionProps } from "@kernel/modules/Pointer/components/PointerContainer";

export interface ConfirmButtonProps extends PointerContainerActionProps {
  handleConfirm: () => void;
}

export const ConfirmAndCloseButton = ({
  closeContainer,
  handleConfirm,
  ...props
}: ConfirmButtonProps) => {
  return (
    <IconButton
      {...props}
      color="success"
      key="accept"
      onClick={(e) => {
        handleConfirm();
        closeContainer && closeContainer(e);
      }}
    >
      <CheckSharpIcon />
    </IconButton>
  );
};
