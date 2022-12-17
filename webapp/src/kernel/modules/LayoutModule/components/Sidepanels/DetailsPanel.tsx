import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  Theme,
  useTheme,
} from "@kernel/modules/LayoutModule/contexts/ThemeContext";
import styled from "styled-components";

import { useAppDispatch, useAppSelector } from "@kernel/store (deprecated)/hooks";
import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/LayoutModule";

import RightPanelTitle from "./RightPanelTitle";
import SidePanelContent from "./SidePanelContent";

const StyledRightPanel = styled("div")<{ theme: Theme; $isopen: boolean }>`
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};

  border-left: solid 1px
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  height: 100%;
  min-width: ${(props) => (props.$isopen ? "20vw" : "2vw")};
  max-width: 25vw;
  flex-direction: flex-end;
  display: ${(props) => (props.$isopen ? "block" : "none")};
  right: 0;
`;

const DetailsPanel = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();

  const layoutModule = useModule<ILayoutModule>("LayoutModule");
  const { rightPanelClosed } = layoutModule.store.actions;

  const { theme } = useTheme();
  const { isOpen, title } = useAppSelector(
    (state) => state.LayoutModule.rightPanel
  );

  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!container) {
      setContainer(
        document.getElementById(layoutModule.constants.DETAILS_PANEL_ID)
      );
    }
  }, []);

  const handleClick = () => {
    // expandable logic for left panel
    if (isOpen) dispatch(rightPanelClosed());
  };

  if (!container) return null;

  return createPortal(
    <StyledRightPanel theme={theme} $isopen={isOpen}>
      <RightPanelTitle title={title} onClick={handleClick} isOpen={isOpen} />
      <SidePanelContent>{children}</SidePanelContent>
    </StyledRightPanel>,
    container
  );
};

export default DetailsPanel;
