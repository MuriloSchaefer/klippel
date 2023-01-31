import { Box, IconButton } from "@mui/material";
import UnfoldLessIcon from "@mui/icons-material/UnfoldLess";
import React from "react";
import { createPortal } from "react-dom";
import { SETTINGS_PANEL_ID } from "../../constants";
import TuneSharp from "@mui/icons-material/TuneSharp";

export const SettingsPanel = ({
  title,
  children,
}: {
  title?: string;
  children: React.ReactElement;
}) => {
  const ref = document.getElementById(SETTINGS_PANEL_ID);

  if (!ref) return null;
  return createPortal(
    <Box
      role="settings-panel"
      aria-label="settings panel"
      sx={{
        borderRight: 1,
        overflow: "hidden",
        borderColor: "divider",
        height: "100%",
        transition: "width 0.5s cubic-bezier(0.075, 0.82, 0.165, 1)",
        padding: 1,

        display: "flex",
        flexDirection: "column",
        gap: 1,

        '@media (orientation: portrait)': {
          borderRight: 1,
          borderTop: 1,
          borderColor: 'divider',
          height: 'max-content'
        }
      }}
    >
      <Box
        role="panel-header"
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 4
        }}
      >
        <TuneSharp />
        <span>{title ?? "Configurações"}</span>
        <IconButton
          size="small"
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            console.log(e);
          }}
        >
          <UnfoldLessIcon sx={{ transform: "rotate(90deg)" }} />
        </IconButton>
      </Box>
      <Box role="panel-content">{children}</Box>
    </Box>,
    ref
  );
};

export default SettingsPanel;
