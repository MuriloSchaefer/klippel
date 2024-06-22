import React, { MouseEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import CloseSharp from "@mui/icons-material/CloseSharp";
import Box, { BoxProps } from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";

import { Store } from "@kernel/modules/Store";
import useModule from "@kernel/hooks/useModule";

import { DETAILS_PANEL_ID } from "../../constants";
import usePanelsManager from "../../hooks/usePanelsManager";
import { selectDetailsPanel } from "../../store/panels/selectors";

type DetailsPanelProps = BoxProps & {
  title?: string;
  display?: boolean;
  children: React.ReactElement | React.ReactElement[];
};

export const DetailsPanel = ({
  title,
  display,
  children,
  sx,
  ...props
}: DetailsPanelProps) => {
  const ref = document.getElementById(DETAILS_PANEL_ID);
  const isPortrait = useMediaQuery("(orientation: portrait)");

  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const panelsManager = usePanelsManager();
  const panelState = useAppSelector(selectDetailsPanel);

  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (panelState && panelState.state === "opened")
        panelsManager.functions.closeDetails();
    },
    [panelState?.state]
  );

  if (!ref || !panelState) return null;
  return createPortal(
    <Box
      role="details-panel"
      aria-label="details panel"
      display={panelState.state === "opened" ? "flex" : "none"}
      sx={{
        ...sx,
        flexDirection: "column",
        padding: 1,
        gap: 1,
        minWidth: "15vw",
      }}
      {...props}
    >
      <Box
        role="panel-header"
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 2,
        }}
      >
        {!isPortrait && (
          <IconButton size="small" component="span" onClick={handleToggle}>
            {panelState.state === "opened" && <CloseSharp />}
          </IconButton>
        )}
        <span>{title ?? "Detalhes"}</span>
      </Box>
      <Box role="panel-content" sx={{overflow: 'auto', height: '100%'}}>
        <ErrorBoundary fallback={<div>Ocorreu um erro</div>}>
          {children}
        </ErrorBoundary>
      </Box>
    </Box>,
    ref
  );
};

export default DetailsPanel;
