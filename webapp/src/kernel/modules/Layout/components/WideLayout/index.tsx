import { Box, ThemeProvider, createTheme, CssBaseline } from "@mui/material";
import grey from '@mui/material/colors/grey'

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectTheme } from "../../store/selectors";
import RibbonMenu from "../RibbonMenu";
import React, { useMemo } from "react";
import ViewportManager from "../ViewportManager";
import SystemTray from "../SystemTray";

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

const Layout = () => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const selectedTheme = useAppSelector(selectTheme);
  
  const theme = useMemo(()=> createTheme({
    palette: {
      mode: selectedTheme ?? 'dark',
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
      fontFamily: 'Raleway, Arial',
    },
  }), [selectedTheme])

  const commonCSSPanels = {
    position: 'sticky',
    borderColor: "divider", 
    height: '100%',
    transition: 'width 0.5s cubic-bezier(0.075, 0.82, 0.165, 1)',
    padding: 1
  }

  return (
    <ThemeProvider theme={theme}>
        <CssBaseline />
      <Box
        role="layout-root"
        sx={{
          height: "100vh",
          display: "stiky",
          top: 0,
        }}
      >
        {/* <FloatingDocumentationContainer /> */}
        <RibbonMenu ><SystemTray /></RibbonMenu>
        <Box role="content" sx={{
            display: "flex",
            justifyContent:"space-between",
            height:"100%",
        }}>
            <Box role="settings-panel" aria-label="settings panel" sx={{
                borderRight: 1, left: 0,
                minWidth: '10vh', width: 'min(10vh, 30vh)',
                '&:hover': {
                    width: '30vh',
                },
                ...commonCSSPanels,
            }}><div style={{width:'20vh'}}/></Box>
            
            <ViewportManager />
            <Box role="details-panel" aria-label="details panel" sx={{
                borderLeft: 1, right: 0,
                minWidth: '1vh', width: 'min(1vh, 30vh)',
                '&:hover': {
                    width: '30vh',
                },
                ...commonCSSPanels,
            }}/>
        </Box>
      </Box>
    </ThemeProvider>
  );
};

export default React.memo(Layout);
