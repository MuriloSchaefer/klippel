import React, { useCallback, useMemo } from "react";
import Box from "@mui/material/Box";
import IconButton from "@mui/material/IconButton";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectTheme } from "../../store/selectors";
import useLayoutManager from "../../hooks/useLayoutManager";
import { SYSTEM_TRAY_REGISTRY_NAME } from "../../constants";

const SystemTray = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { SessionAutoSaverIcon, WorkspaceSelector } = storeModule.components;
  const { componentRegistry } = storeModule.managers;

  const selectedTheme = useAppSelector(selectTheme);
  const componentRegistryManager = componentRegistry();
  const layoutManager = useLayoutManager();

  const handleThemeSwitch = useCallback(() => {
    layoutManager.functions.setTheme(
      selectedTheme == "dark" ? "light" : "dark"
    );
  }, [selectedTheme]);

  const elements = useMemo(() => {
    const reg = componentRegistryManager.functions.getRegistry(
      SYSTEM_TRAY_REGISTRY_NAME
    );
    console.log(reg)
    return Object.values(reg);
  }, [componentRegistryManager]);
  console.log(elements)

  return (
    <Box role="system-tray-container" sx={{display: 'flex', gap: 1, alignItems: 'center'}}>
      {elements.map((El) => (
        <El />
      ))}
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
