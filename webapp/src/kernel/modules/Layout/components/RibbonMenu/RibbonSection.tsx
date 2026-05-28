import React from "react";
import { Box, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export interface RibbonSectionProps {
  name: string;
  width?: number | string;
  sx?: SxProps<Theme>;
  children: React.ReactNode;
}

/**
 * Standard ribbon-tab section frame: a column with a row of controls
 * on top and the section name as a caption below. Used by every
 * module that contributes a section to the ribbon menu — keeps the
 * vertical rhythm and caption typography consistent across tabs.
 */
const RibbonSection: React.FC<RibbonSectionProps> = ({
  name,
  width = 100,
  sx,
  children,
}) => (
  <Box
    sx={{
      display: "flex",
      flexDirection: "column",
      justifyContent: "center",
      height: "stretch",
      width,
      px: 2,
      ...sx,
    }}
  >
    <Box
      sx={{
        display: "flex",
        height: "-webkit-fill-available",
        gap: 0.5,
        flexWrap:'wrap',
        alignItems: "flex-start",
        justifyContent: 'space-between'
      }}
    >
      {children}
    </Box>
    <Typography align="center" variant="caption">
      {name}
    </Typography>
  </Box>
);

export default RibbonSection;
