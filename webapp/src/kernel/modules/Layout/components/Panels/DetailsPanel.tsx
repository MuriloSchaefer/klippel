import React, { MouseEvent, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import CloseSharp from "@mui/icons-material/CloseSharp";
import Box, { BoxProps } from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import useMediaQuery from "@mui/material/useMediaQuery";

import { Store } from "@kernel/modules/Store";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import { fallbackRender } from "@kernel/App";

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
  const [retry, setRetry] = useState(false)
  const ref = useMemo(()=> document.getElementById(DETAILS_PANEL_ID), [retry]);
  const isPortrait = useMediaQuery("(orientation: portrait)");

  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const keyboardShortcutsModule = useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const { ShortcutHint } = keyboardShortcutsModule.components;

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

  if (!ref){
    setTimeout(()=>setRetry(!retry), 50)
    return null
  }
  if (!panelState) return null;
  return createPortal(
    <Box
      role="details-panel"
      aria-label="details panel"
      sx={{
        ...sx,
        display: panelState.state === "opened" ? "flex" : "none",
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
          <ShortcutHint shortcutId="layout.panels.details.toggle" placement="bottom-left">
            <IconButton size="small" component="span" aria-label="close details panel" onClick={handleToggle}>
              {panelState.state === "opened" && <CloseSharp />}
            </IconButton>
          </ShortcutHint>
        )}
        <span>{title ?? "Detalhes"}</span>
      </Box>
      <Box role="panel-content" sx={{ height: '100%'}}>
        <ErrorBoundary fallbackRender={fallbackRender}>
          {children}
        </ErrorBoundary>
      </Box>
    </Box>,
    ref
  );
};

export default DetailsPanel;
