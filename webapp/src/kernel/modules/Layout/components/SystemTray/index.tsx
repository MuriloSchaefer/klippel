import React, { useCallback } from "react";
import { Box, IconButton } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectTheme } from "../../store/selectors";
import useLayoutManager from "../../hooks/useLayoutManager";

const SystemTray = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const selectedTheme = useAppSelector(selectTheme);

  const layoutManager = useLayoutManager()

  const handleThemeSwitch = useCallback(() => {
    layoutManager.functions.setTheme(selectedTheme == "dark" ? "light" : "dark")
  }, [selectedTheme]);

  return (
    <Box role="system-tray-container">
      <IconButton
        color="primary"
        aria-label="switch theme button"
        onClick={handleThemeSwitch}
      >
        {selectedTheme === "light" ? (
          <DarkModeOutlinedIcon fontSize="small" />
        ) : (
          <LightModeOutlinedIcon fontSize="small" />
        )}
      </IconButton>
    </Box>
  );
};

export default React.memo(SystemTray);
