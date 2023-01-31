import CloseSharp from "@mui/icons-material/CloseSharp";
import { Box, IconButton, styled } from "@mui/material";
import React from "react";
import { createPortal } from "react-dom";
import { DETAILS_PANEL_ID } from "../../constants";


const StyledPanel = styled(Box)`
  overflow: hidden;
  height: 100%;
  flex-direction: column;
`

export const DetailsPanel = ({
  title,
  display,
  children,
}: {
  title?: string;
  display?: boolean
  children: React.ReactElement;
}) => {
  const ref = document.getElementById(DETAILS_PANEL_ID);

  if (!ref) return null;
  return createPortal(
    <StyledPanel
      role="details-panel"
      aria-label="details panel"
      display={display ? 'flex' : 'none'}
      sx={{
        borderLeft: 1,
        borderColor: 'divider',
        padding: 1,
        gap: 1,
        minWidth: '15vw',
        '@media (orientation: portrait)': {
          borderLeft: 0,
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
          gap: 2
        }}
      >
        <IconButton
          size="small"
          component="span"
          onClick={(e) => {
            e.stopPropagation();
            console.log(e);
          }}
        >
          <CloseSharp />
        </IconButton>
        <span>{title ?? "Detalhes"}</span>
      </Box>
      <Box role="panel-content">{children}</Box>
    </StyledPanel>,
    ref
  );
};

export default DetailsPanel;
