import type { ButtonProps, SxProps } from "@mui/material";
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Modal from '@mui/material/Modal';
import React, { MouseEvent, useCallback, useState } from "react";

export interface SystemModalProps {
  closeModal?: () => void; // QUESTION: how to enforce remove optional from here without requiring to define on usage
}

const SystemModal = ({
  title,
  component,
  button,
  sx = {},
}: {
  title?: string | React.ReactElement;
  component: React.ReactElement<SystemModalProps>;
  button: React.ReactElement<ButtonProps>;
  // children: React.ReactNode | React.ReactNode[];
  sx?: SxProps;
}) => {
  const [open, setOpen] = useState(false);
  const handleOpen = useCallback((e: MouseEvent) => {
    setOpen(true);
    e.stopPropagation();
  }, []);
  const handleClose = useCallback(() => {
    setOpen(false);
  }, []);

  return (
    <>
      <Modal open={open} onClose={handleClose} components={{Backdrop: undefined}}>
        <Paper
          elevation={6}
          id="modal-content"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            p: 4,
            ...sx,
          }}
          draggable
        >
          {title && <Typography variant="subtitle1" component="span">
            {title}
          </Typography>}
          {React.cloneElement(component, { closeModal: handleClose })}
        </Paper>
      </Modal>
      {React.cloneElement(button, {onClick: handleOpen})}
      {/* <Box onClick={handleOpen}>{children}</Box> */}
    </>
  );
};

export default SystemModal;
