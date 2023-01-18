import React, { useCallback } from "react";
import { Box, IconButton } from "@mui/material";
import DarkModeOutlinedIcon from "@mui/icons-material/DarkModeOutlined";
import LightModeOutlinedIcon from "@mui/icons-material/LightModeOutlined";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { switchTheme } from "../../store/actions";
import { selectTheme } from "../../store/selectors";

const SystemTray = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector, useAppDispatch } = storeModule.hooks;

  const dispatch = useAppDispatch();
  const selectedTheme = useAppSelector(selectTheme);
  console.log(selectedTheme);

  const handleThemeSwitch = useCallback(() => {
    // TODO: move to a theme manager
    console.log(selectedTheme);
    dispatch(
      switchTheme({ theme: selectedTheme == "dark" ? "light" : "dark" })
    );
  }, [selectedTheme]);

  return (
    <Box >
      <IconButton
        color="primary"
        aria-label="switch theme button"
        onClick={handleThemeSwitch}
      >
        {selectedTheme === "light" ? (
          <DarkModeOutlinedIcon />
        ) : (
          <LightModeOutlinedIcon />
        )}
      </IconButton>
    </Box>
  );
};

export default React.memo(SystemTray);
