import React, { cloneElement, MouseEvent, useCallback, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { ErrorBoundary } from "react-error-boundary";

import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';

import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import UnfoldMoreSharpIcon from "@mui/icons-material/UnfoldMoreSharp";
import TuneSharp from "@mui/icons-material/TuneSharp";

import { Store } from "@kernel/modules/Store";
import useModule from "@kernel/hooks/useModule";

import { SETTINGS_PANEL_ID } from "../../constants";
import usePanelsManager from "../../hooks/usePanelsManager";
import { selectSettingsPanel } from "../../store/panels/selectors";
import { fallbackRender } from "@kernel/App";

export const SettingsPanel = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactElement | React.ReactElement[];
}) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const panelsManager = usePanelsManager();
  const panelState = useAppSelector(selectSettingsPanel);

  const [retry, setRetry] = useState(false)
  const ref = useMemo(()=>document.getElementById(SETTINGS_PANEL_ID), [retry])

  const handleToggleSettings = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (panelState && panelState.state === "collapsed")
        panelsManager.functions.expandSettings();

      if (panelState && panelState.state === "expanded")
        panelsManager.functions.collapseSettings();
    },
    [panelState?.state]
  );
  if (!ref){
    setTimeout(()=>setRetry(!retry), 50)
    return null
  }
  if (!panelState) return null;
  return createPortal(
    <Box sx={{ position: "relative" }}>
      <Box
        role="settings-panel"
        aria-label="settings panel"
        sx={{
          overflowX: "hidden",
          "&::-webkit-scrollbar": {
            width: "0.4em",
          },

          //height: "100%",
          padding: 1,
          maxWidth: panelState.state === "collapsed" ? "6vw" : "100%",

          display: "flex",
          flexDirection: "column",
          gap: 1,

          "@media (orientation: portrait)": {
            maxWidth: panelState.state === "collapsed" ? "8vw" : "100%",
          },
        }}
      >
        <Box
          role="panel-header"
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          {panelState.state === "expanded" && (
            <>
              <TuneSharp />
              <span>{title ?? "Configurações"}</span>
            </>
          )}
          <IconButton
            size="small"
            component="span"
            onClick={handleToggleSettings}
          >
            {panelState.state === "collapsed" ? (
              <UnfoldMoreSharpIcon sx={{ transform: "rotate(90deg)" }} />
            ) : (
              <UnfoldLessIcon sx={{ transform: "rotate(90deg)" }} />
            )}
          </IconButton>
        </Box>
        <Box
          role="panel-content"
          sx={{
            display: "flex",
            flexDirection: "column",
            width: "100%",
            overflowX: 'auto',
            placeSelf: "center",
            gap: panelState.state === "collapsed" ? 2 : 0,
            marginTop: 4,
          }}
        >
          <ErrorBoundary fallbackRender={fallbackRender}>
            {Array.isArray(children) ? children.map((child, idx) =>
              cloneElement(child, { state: panelState.state, key: idx })
            ) : cloneElement(children, { state: panelState.state })}
          </ErrorBoundary>
        </Box>
      </Box>
    </Box>,
    ref
  );
};

export default SettingsPanel;
