import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";

import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import {
  Theme,
  useTheme,
} from "@kernel/modules/LayoutManager/contexts/ThemeContext";

import useModule from "@kernel/hooks/useModule";
import SidePanelContent from "./SidePanelContent";
import LeftPanelTitle from "./LeftPanelTitle";
import { ILayoutManagerModule } from "../..";

export const StyledSettingsPanel = styled("div")<{
  theme: Theme;
  isOpen: boolean;
}>`
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};

  border-right: solid 1px
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};
  position: sticky;
  height: 100%;
  min-width: ${(p) => (p.isOpen ? "20vw" : "1vw")};
  width: ${(p) => (p.isOpen ? "20vw" : "1vw")};
  transition: width 0.2s cubic-bezier(0.075, 0.82, 0.165, 1);
  max-width: 25vw;
  left: 0;
`;

const SettingsPanel = ({ children }: { children: React.ReactNode }) => {
  const dispatch = useAppDispatch();
  const layoutManager = useModule<ILayoutManagerModule>("LayoutManager");
  const { leftPanelCollapsed, leftPanelExpanded } = layoutManager.store.actions;

  const { theme } = useTheme();
  const { isOpen, title } = useAppSelector(
    (state) => state.layoutManager.leftPanel
  );

  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!container) {
      setContainer(
        document.getElementById(layoutManager.constants.SETTING_PANEL_ID)
      );
    }
  }, []);

  const handleClick = () => {
    // expandable logic for left panel
    if (isOpen) dispatch(leftPanelCollapsed());
    else dispatch(leftPanelExpanded());
  };

  if (!container) return null;

  return createPortal(
    <StyledSettingsPanel theme={theme} isOpen={isOpen}>
      <LeftPanelTitle title={title} onClick={handleClick} isOpen={isOpen} />
      {isOpen && <SidePanelContent>{children}</SidePanelContent>}
    </StyledSettingsPanel>,
    container
  );
};

export default SettingsPanel;
