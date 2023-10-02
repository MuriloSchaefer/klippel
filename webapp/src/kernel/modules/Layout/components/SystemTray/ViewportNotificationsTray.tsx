import React, { cloneElement, MouseEvent, useCallback } from "react";
import { createPortal } from "react-dom";

import Box from "@mui/material/Box";

import { VIEWPORT_NOTIFICATIONS_ID } from "../../constants";

export const ViewportNotificationsTray = ({
  children,
}: {
  children: React.ReactNode | React.ReactNode[];
}) => {
  const ref = document.getElementById(VIEWPORT_NOTIFICATIONS_ID);

  if (!ref) return null;

  return createPortal(
    <Box sx={{position:'relative'}}>
      {children}
    </Box>,
    ref
  );
};

export default ViewportNotificationsTray;
