import {
  MouseEvent,
  cloneElement,
  useCallback,
  useState,
} from "react";
import {
  Box,
  IconButton,
  IconButtonProps,
  Modal,
  Paper,
} from "@mui/material";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import DragIndicatorSharpIcon from "@mui/icons-material/DragIndicatorSharp";

import useDraggable from "../hooks/useDraggable";

export interface PointerContainerActionProps extends IconButtonProps {
  closeContainer?: (e: MouseEvent) => void;
}

export const PointerContainer = ({
  children,
  component,
  actions,
  onClose,
}: {
  children: React.ReactElement;
  component: React.ReactElement;
  actions: React.ReactElement<PointerContainerActionProps>[];
  onClose?: (event: MouseEvent) => void;
}) => {
  const [open, setOpen] = useState(false);
  
  const { innerWidth: width, innerHeight: height } = window;
  const windowCenter = [width / 2, height / 2];
  const {position, setPosition, listeners} = useDraggable({initialPosition: {x: windowCenter[0], y: windowCenter[1]}})
  const getQuadrant = useCallback((x: number, y: number) => {
    const deltaX = x - windowCenter[0];
    const deltaY = y - windowCenter[1];

    if (deltaX < 0) {
      return deltaY < 0 ? 1 : 3;
    } else {
      return deltaY < 0 ? 2 : 4;
    }
  }, [windowCenter]);

  const handleOpen = useCallback((e: MouseEvent) => {
    setOpen(true);
    setPosition({x: e.clientX, y:e.clientY})
    e.stopPropagation();
  }, []);

  const handleClose = useCallback((e: MouseEvent) => {
    setOpen(false);
    e.stopPropagation();
     onClose?.(e)
  }, []);


  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        disableEnforceFocus
        sx={{
          left: position.x,
          top: position.y,
          width: "min-content",
          height: "min-content",
          touchAction: 'none',
        }}
        slotProps={{ backdrop: {} }}
        slots={{
          backdrop: () => null,
        }}
        {...listeners}
      >
        
        <Paper
          sx={{
            position: "fixed",
            margin: 1,
            display: "flex",
            flexGrow: 1,
            flexDirection: getQuadrant(position.x, position.y) % 2 == 1 ? "row" : "row-reverse",
          }}
          elevation={6}
          id="pointer-portal"
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
              flexGrow: 2,
              justifyContent: "center",
              alignContent: "space-around",
            }}
            role="pointer-container-actions"
          >
            <IconButton sx={{ cursor: "grab" }} size="small">
              <DragIndicatorSharpIcon />
            </IconButton>

            {actions.map((a) =>
              cloneElement(a, {
                sx: { flexGrow: "inherit" },
                size: "small",
                closeContainer: handleClose,
              })
            )}

            <IconButton
              color="error"
              key="reject"
              onClick={handleClose}
              size="small"
            >
              <CloseSharpIcon />
            </IconButton>
          </Box>
          <Box
            role="content"
            sx={{
              padding: 1,
              display: "flex",
              justifyContent: "center",
              alignContent: "center",
            }}
          >
            {component}
          </Box>
        </Paper>
      </Modal>
      {cloneElement(children, { onClick: handleOpen })}
    </>
  );
};

export default PointerContainer;
