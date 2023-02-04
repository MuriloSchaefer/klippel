import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import CloseSharp from "@mui/icons-material/CloseSharp";
import { Box, IconButton, styled, useMediaQuery } from "@mui/material";
import React, { MouseEvent, useCallback } from "react";
import { createPortal } from "react-dom";
import { DETAILS_PANEL_ID } from "../../constants";
import usePanelsManager from "../../hooks/usePanelsManager";
import { selectDetailsPanel } from "../../store/panels/selectors";


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
  children: React.ReactElement | React.ReactElement[];
}) => {
  const ref = document.getElementById(DETAILS_PANEL_ID);
  const isPortrait = useMediaQuery('(orientation: portrait)')

  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const panelsManager = usePanelsManager();
  const panelState = useAppSelector(selectDetailsPanel);


  const handleToggle = useCallback(
    (e: MouseEvent) => {
      e.stopPropagation();
      if (panelState && panelState.state === "opened")
        panelsManager.functions.closeDetails();
    },
    [panelState?.state]
  );

  if (!ref || !panelState) return null;
  return createPortal(
    <StyledPanel
      role="details-panel"
      aria-label="details panel"
      display={panelState.state === 'opened' ? 'flex' : 'none'}
      sx={{
        padding: 1,
        gap: 1,
        minWidth: '15vw',
        
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
        { !isPortrait && <IconButton
          size="small"
          component="span"
          onClick={handleToggle}
        >
          {panelState.state === "opened" && <CloseSharp />}
        </IconButton>}
        <span>{title ?? "Detalhes"}</span>
      </Box>
      <Box role="panel-content">{children}</Box>
    </StyledPanel>,
    ref
  );
};

export default DetailsPanel;
