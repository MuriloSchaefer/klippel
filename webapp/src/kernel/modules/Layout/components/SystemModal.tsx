import { Box, Paper, Modal } from "@mui/material";
import React, { MouseEvent, useCallback, useState } from "react";

export interface SystemModalProps {
  closeModal?: ()=>void; // QUESTION: how to enforce remove optional from here without requiring to define on usage
}

const SystemModal = ({
  component,
  children,
}: {
  component: React.ReactElement<SystemModalProps>;
  children: React.ReactNode | React.ReactNode[];
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
      <Modal open={open} onClose={handleClose}>
        <Paper
          elevation={6}
          id="tune-modal"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            p: 4,
          }}
        >
          {React.cloneElement(component, {closeModal: handleClose})}
        </Paper>
      </Modal>
      <Box onClick={handleOpen}>{children}</Box>
    </>
  );
};

export default SystemModal;
