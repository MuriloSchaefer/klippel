import React, { useRef } from "react";
import { Box } from "@mui/material";
import {
  AnyHandlerEventTypes,
  GestureHandlers,
  useGesture,
} from "@use-gesture/react";

const MultiTouchPanel = ({
  gestures,
  children,
}: {
  gestures: GestureHandlers<AnyHandlerEventTypes>;
  children: any;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const bind = useGesture(gestures, {
    drag: { filterTaps: true, triggerAllEvents: true },
  });
  const props = bind()
  console.log(props)

  return (
    <Box
      role="multi-touch-panel"
      ref={ref}
      {...props}
      sx={{ position: "relative", touchAction: "none" }}
    >
      {children}
    </Box>
  );
};

export default MultiTouchPanel;
