import {
  Box,
  Collapse,
  IconButton,
  IconButtonProps,
  Modal,
  Paper,
} from "@mui/material";
import {
  MouseEvent,
  cloneElement,
  useCallback,
  useMemo,
  useRef,
  useState,
} from "react";
import Draggable from "react-draggable";
import CloseSharpIcon from "@mui/icons-material/CloseSharp";

import DragIndicatorSharpIcon from "@mui/icons-material/DragIndicatorSharp";

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

  const { innerWidth: width, innerHeight: height } = window;
  const windowCenter = [width / 2, height / 2];

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({
    x: windowCenter[0],
    y: windowCenter[1],
  });
  const handleOpen = useCallback((e: MouseEvent) => {
    setPosition({ x: e.clientX, y: e.clientY });
    setOpen(true);
    e.stopPropagation();
  }, []);
  const handleClose = useCallback((e: MouseEvent) => {
    setOpen(false);
    e.stopPropagation();
    onClose && onClose(e);
  }, []);

  const quadrant = useMemo(() => {
    const x = position.x - windowCenter[0];
    const y = position.y - windowCenter[1];

    if (x < 0) {
      return y < 0 ? 1 : 3;
    } else {
      return y < 0 ? 2 : 4;
    }
  }, [position, windowCenter]);

  return (
    <>
      <Modal
        open={open}
        onClose={handleClose}
        disableEnforceFocus
        sx={{
          top: position.y,
          left:
            [2, 4].includes(quadrant) && ref.current
              ? `calc(${position.x}px - ${ref.current.clientWidth}px)`
              : position.x,
          width: "min-content",
          height: "min-content",
        }}
        slotProps={{ backdrop: {} }}
        slots={{
          backdrop: () => null,
        }}
      >
        <Collapse
          orientation="horizontal"
          in={open}
          onClick={(e) => e.stopPropagation()}
        >
          <Draggable>
            <Paper
              ref={ref}
              sx={{
                position: "fixed",
                margin: 1,
                //top: "500px",
                // height: '100%',
                display: "flex",
                flexGrow: 1,
                flexDirection: quadrant % 2 == 1 ? "row" : "row-reverse",
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
          </Draggable>
        </Collapse>
      </Modal>
      {cloneElement(children, { onClick: handleOpen })}
    </>
  );
};

export default PointerContainer;
