import { Box, Paper, Modal, SxProps, Typography } from "@mui/material";
import React, { MouseEvent, useCallback, useState } from "react";

export interface SystemModalProps {
  closeModal?: () => void; // QUESTION: how to enforce remove optional from here without requiring to define on usage
}

const SystemModal = ({
  title,
  component,
  children,
  sx = {},
}: {
  title?: string | React.ReactElement;
  component: React.ReactElement<SystemModalProps>;
  children: React.ReactNode | React.ReactNode[];
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
      <Box onClick={handleOpen}>{children}</Box>
    </>
  );
};

export default SystemModal;
