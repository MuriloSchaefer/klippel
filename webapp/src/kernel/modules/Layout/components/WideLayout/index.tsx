import { styled, ThemeProvider } from '@mui/system';
import { createTheme } from '@mui/material/styles';
import Box from '@mui/material/Box';
import CssBaseline from '@mui/material/CssBaseline';


import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectTheme } from "../../store/selectors";
import RibbonMenu from "../RibbonMenu";
import React, { useMemo } from "react";
import ViewportManager from "../ViewportManager";
import SystemTray from "../SystemTray/SystemTray";
import { DETAILS_PANEL_ID, SETTINGS_PANEL_ID } from "../../constants";

declare module "@mui/material/styles" {
  interface Theme {
    status: {
      danger: string;
    };
  }
  // allow configuration using `createTheme`
  interface ThemeOptions {
    status?: {
      danger?: string;
    };
  }
}

const StyledContent = styled(Box)`
  display: grid;
  height: 100vh;

  grid-template-rows: min-content auto;
  grid-template-areas:
    "ribbon ribbon ribbon"
    "settings viewport details";

  @media (orientation: portrait) {
    grid-template-rows: auto 2fr minmax(10px, 2fr);
    grid-template-areas:
      "ribbon ribbon"
      "viewport viewport"
      "settings details";
  }
`;

const Layout = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const selectedTheme = useAppSelector(selectTheme);

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode: selectedTheme ?? "dark",
          // Used by `getContrastText()` to maximize the contrast between
          // the background and the text.
          contrastThreshold: 3,
          // Used by the functions below to shift a color's luminance by approximately
          // two indexes within its tonal palette.
          // E.g., shift from Red 500 to Red 300 or Red 700.
          tonalOffset: 0.2,
        },
        typography: {
          // In Chinese and Japanese the characters are usually larger,
          // so a smaller fontsize may be appropriate.
          fontSize: 12,
          fontFamily: "Raleway, Arial",
        },
      }),
    [selectedTheme]
  );

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box role="layout-root" sx={{ minHeight: "100vh" }}>
        {/* <FloatingDocumentationContainer /> */}
        <StyledContent
          role="content"
          sx={{
            gridTemplateColumns: `auto minmax(auto, 4fr) auto`,
          }}
        >
          <Box
            sx={{
              gridArea: "ribbon",
              width: "100%",
            }}
          >
            <RibbonMenu>
              <SystemTray />
            </RibbonMenu>
          </Box>

          <Box
            id={SETTINGS_PANEL_ID}
            role="settings-panel-container"
            sx={{
              gridArea: "settings",
              minHeight: "100%",
              borderTop: 0,
              borderRight: 1,
              borderColor: "divider",
              overflow: "auto",
              "@media (orientation: portrait)": {
                borderTop: 1,
                borderColor: "divider",
              },
            }}
          />

          <ViewportManager
            sx={{
              gridArea: "viewport",
              position: "relative",
              overflow: "auto",
              "&::-webkit-scrollbar": {
                width: "0.4em",
              },
            }}
          />

          <Box
            id={DETAILS_PANEL_ID}
            role="details-panel-container"
            sx={{
              gridArea: "details",
              width: "100%",
              //minHeight: "100%",
              borderLeft: 1,
              borderColor: "divider",
              overflow: "auto",
              "@media (orientation: portrait)": {
                borderLeft: 0,
                borderTop: 1,
                borderColor: "divider",
                //height: "max-content",
              },
            }}
          />
        </StyledContent>
      </Box>
    </ThemeProvider>
  );
};

export default React.memo(Layout);
