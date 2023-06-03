import { MouseEvent, useCallback, useState } from "react";
import { Box, IconButton, Modal, Paper } from "@mui/material";
import useCompositionsManager from "../hooks/useCompositionsManager";
import FileOpenIcon from "@mui/icons-material/FileOpen";

export const ModelSection = () => {
  const compositionsManager = useCompositionsManager();

  const handleModelSelection = useCallback((name: string, path: string) => {
    compositionsManager.functions.createComposition(name, path);
  }, []);

  const [open, setOpen] = useState(false);
  const handleOpen = useCallback((e: MouseEvent) => {
    setOpen(true);
    e.stopPropagation();
  }, []);
  const handleClose = useCallback((e: MouseEvent) => {
    setOpen(false);
  }, []);

  return (
    <>
      <Modal open={open} onClose={handleClose}>
        <Paper
          elevation={6}
          id="open-model-modal"
          sx={{
            position: "absolute",
            top: "50%",
            left: "50%",
            transform: "translate(-50%, -50%)",
            bgcolor: "background.paper",
            p: 4,
          }}
        >
          <Box
            onClick={(e) => {
              handleModelSelection("Decorated", "camisa-polo/decorated.svg");
              handleClose(e);
            }}
            sx={{cursor:'pointer'}}
          >
            Camisa polo fem
          </Box>
        </Paper>
      </Modal>
      <IconButton onClick={handleOpen}>
        <FileOpenIcon />
      </IconButton>
    </>
  );
};

export default ModelSection;
