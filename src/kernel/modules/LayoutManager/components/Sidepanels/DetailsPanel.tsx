import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Theme,
  useTheme,
} from "@kernel/modules/LayoutManager/contexts/ThemeContext";
import styled from "styled-components";

import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import useModule from "@kernel/hooks/useModule";
import { ILayoutManagerModule } from "@kernel/modules/LayoutManager";

import RightPanelTitle from "./RightPanelTitle";
import SidePanelContent from "./SidePanelContent";

const StyledRightPanel = styled("div")<{ theme: Theme; isOpen: boolean }>`
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};

  border-left: solid 1px
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  height: 100%;
  min-width: ${(props) => (props.isOpen ? "20vw" : "2vw")};
  max-width: 25vw;
  flex-direction: flex-end;
  display: ${(props) => (props.isOpen ? "block" : "none")};
  right: 0;
`;

const DetailsPanel = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();

  const layoutManager = useModule<ILayoutManagerModule>("LayoutManager");
  const { rightPanelClosed } = layoutManager.store.actions;

  const { theme } = useTheme();
  const { isOpen, title } = useAppSelector(
    (state) => state.layoutManager.rightPanel
  );

  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!container) {
      setContainer(
        document.getElementById(layoutManager.constants.DETAILS_PANEL_ID)
      );
    }
  }, []);

  const handleClick = () => {
    // expandable logic for left panel
    if (isOpen) dispatch(rightPanelClosed());
  };

  if (!container) return null;

  return createPortal(
    <StyledRightPanel theme={theme} isOpen={isOpen}>
      <RightPanelTitle title={title} onClick={handleClick} isOpen={isOpen} />
      <SidePanelContent>{children}</SidePanelContent>
    </StyledRightPanel>,
    container
  );
};

export default DetailsPanel;
