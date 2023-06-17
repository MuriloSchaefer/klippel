import {
  MouseEvent,
  cloneElement,
  useCallback,
  useMemo,
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

  const quadrant = useMemo(()=>getQuadrant(position.x, position.y), [position])

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
        role="pointer-panel"
        sx={{
          width: "min-content",
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
            left: position.x,
            top: position.y, //getQuadrant(position.x, position.y) < 3 ? position.y : `calc(${position.y}px - 100%)`,
            display: "flex",
            flexGrow: 1,
            flexDirection: quadrant % 2 == 1 ? "row" : "row-reverse",
          }}
          elevation={6}
        >
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              padding: 0,
              flexGrow: 2,
              justifyContent: "space-evenly",
              alignContent: "space-evenly",
              borderLeft: `1px solid rgba(0,0,0, ${quadrant % 2 == 1 ? 0 : 0.1})`,
              borderRight: `1px solid rgba(0,0,0, ${quadrant % 2 == 1 ? 0.1 : 0})`
            }}
            role="actions"
          >
            <IconButton sx={{ cursor: "grab" }} size="small" id="drag-panel">
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
              id="close-panel"
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
