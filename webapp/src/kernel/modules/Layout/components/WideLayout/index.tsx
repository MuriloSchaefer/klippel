import {
  Box,
  ThemeProvider,
  createTheme,
  CssBaseline,
  styled,
} from "@mui/material";
import grey from "@mui/material/colors/grey";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectTheme } from "../../store/selectors";
import RibbonMenu from "../RibbonMenu";
import React, { useMemo } from "react";
import ViewportManager from "../ViewportManager";
import SystemTray from "../SystemTray";
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
  min-height: 100%;
  min-width: 100%;

  grid-template-rows: auto  1fr;
  grid-template-areas:
    "ribbon ribbon ribbon"
    "settings viewport details";


  @media (orientation: portrait) {
    grid-template-rows: auto  2fr 2fr;
    grid-template-areas: 
    "ribbon ribbon"
    "viewport viewport"
    "settings details"
    ;
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
      <Box role="layout-root" sx={{height: '100vh'}} >
        {/* <FloatingDocumentationContainer /> */}
        <StyledContent
          role="content"
          sx={{
            gridTemplateColumns: `auto minmax(auto, 4fr) auto`
          }}
        >
          <Box sx={{ gridArea: "ribbon", width: "100%" }}>
            <RibbonMenu>
              <SystemTray />
            </RibbonMenu>
          </Box>

          <Box
            id={SETTINGS_PANEL_ID}
            role="settings-panel-container"
            sx={{ gridArea: "settings", width: 'fit-content' }}
          />

          <ViewportManager sx={{ gridArea: "viewport", }} />

          <Box
            id={DETAILS_PANEL_ID}
            role="details-panel-container"
            sx={{ gridArea: "details" }}
          />
        </StyledContent>
      </Box>
    </ThemeProvider>
  );
};

export default React.memo(Layout);
