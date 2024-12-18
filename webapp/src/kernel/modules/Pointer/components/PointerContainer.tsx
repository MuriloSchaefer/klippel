import React, {
  MouseEvent,
  cloneElement,
  useCallback,
  useMemo,
  useState,
} from "react";
import { ErrorBoundary } from "react-error-boundary";

import type { IconButtonProps } from "@mui/material";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import Modal from "@mui/material/Modal";
import Paper from "@mui/material/Paper";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";
import DragIndicatorSharpIcon from "@mui/icons-material/DragIndicatorSharp";

import useDraggable from "../hooks/useDraggable";

export interface PointerContainerActionProps extends IconButtonProps {
  closeContainer?: (e: MouseEvent) => void;
}

export interface PointerContainerProps {}

const ModalContent = ({
  component,
  position,
  actions,
  handleClose,
}: {
  handleClose: (e: MouseEvent) => void;
  component: React.ReactElement<PointerContainerProps>;
  position: {
    x: number;
    y: number;
  };
  actions: React.ReactElement<PointerContainerActionProps>[];
}) => {
  const { innerWidth: width, innerHeight: height } = window;
  const windowCenter = [width / 2, height / 2];

  const getQuadrant = (x: number, y: number) => {
    const deltaX = x - windowCenter[0];
    const deltaY = y - windowCenter[1];

    if (deltaX < 0) {
      return deltaY < 0 ? 1 : 3;
    } else {
      return deltaY < 0 ? 2 : 4;
    }
  };

  const quadrant = useMemo(
    () => getQuadrant(position.x, position.y),
    []
  );

  return (
    <Paper
      sx={{
        position: "fixed",
        margin: 1,
        left: position.x,
        top: position.y,
        transform: `translate(${quadrant % 2 === 0 ? "-100%" : "0"}, ${
          quadrant > 2 ? "-100%" : "0"
        })`,
        transition: "width 1s ease-in-out",
        transformOrigin: "bottom right",
      }}
      elevation={6}
    >
      <Box
        sx={{
          display: "flex",
          flexGrow: 1,
          flexDirection: quadrant % 2 == 1 ? "row" : "row-reverse",
        }}
        onClick={(evt) => evt.stopPropagation()}
      >
        <Box
          role="pointer-panel-actions"
          sx={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-evenly",
            alignContent: "space-between",
            borderLeft: `1px solid rgba(0,0,0, ${quadrant % 2 == 1 ? 0 : 0.1})`,
            borderRight: `1px solid rgba(0,0,0, ${
              quadrant % 2 == 1 ? 0.1 : 0
            })`,
          }}
        >
          <IconButton sx={{ cursor: "grab" }} size="small" id="drag-panel">
            <DragIndicatorSharpIcon />
          </IconButton>

          {actions.map((a) =>
            cloneElement(a, {
              // sx: { flexGrow: 1 },
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
          role="pointer-panel-content"
          sx={{
            padding: 1,
            display: "flex",
            justifyContent: "center",
            alignContent: "center",
          }}
        >
          <ErrorBoundary fallback={<div>Ocorreu um erro</div>}>
            {component}
          </ErrorBoundary>
        </Box>
      </Box>
    </Paper>
  );
};

export const PointerContainer = ({
  children,
  onClose,
  ...props
}: {
  children: React.ReactElement;
  component: React.ReactElement<PointerContainerProps>;
  actions: React.ReactElement<PointerContainerActionProps>[];
  onClose?: (event: MouseEvent) => void;
}) => {
  const [open, setOpen] = useState(false);

  const { innerWidth: width, innerHeight: height } = window;
  const windowCenter = [width / 2, height / 2];

  const { position, setPosition, listeners } = useDraggable({
    initialPosition: { x: windowCenter[0], y: windowCenter[1] },
  });

  const handleOpen = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
    e.stopPropagation();
  }, []);

  const handleClose = useCallback((e: MouseEvent) => {
    setOpen(false);
    e.stopPropagation();
    onClose?.(e);
  }, []);

  return (
    <>
      <Modal
        open={open}
        keepMounted={true}
        onClose={handleClose}
        disableEnforceFocus
        role="pointer-panel"
        sx={{
          width: "min-content",
          touchAction: "none",
        }}
        slotProps={{ backdrop: {} }}
        slots={{
          backdrop: () => null,
        }}
        {...listeners}
      >
        {open ? (
          <ModalContent
            position={position}
            handleClose={handleClose}
            {...props}
          />
        ) : (
          <></>
        )}
      </Modal>
      {cloneElement(children, { onClick: handleOpen })}
    </>
  );
};

export default PointerContainer;
