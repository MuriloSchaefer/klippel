import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import styled from "styled-components";
import { Theme, useTheme } from "@kernel/contexts/ThemeContext";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { leftPanelCollapsed, leftPanelExpanded } from "@kernel/layout/ations";
import { SETTING_PANEL_ID } from "@kernel/layout/constants";
import SidePanelContent from "./SidePanelContent";
import LeftPanelTitle from "./LeftPanelTitle";

const StyledLeftPanel = styled("div")<{ theme: Theme; isOpen: boolean }>`
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
  const { theme } = useTheme();
  const { isOpen, title } = useAppSelector((state) => state.kernelUI.leftPanel);

  const [container, setContainer] = useState<HTMLElement | null>(null);
  useEffect(() => {
    if (!container) {
      setContainer(document.getElementById(SETTING_PANEL_ID));
    }
  }, []);

  const handleClick = () => {
    // expandable logic for left panel
    if (isOpen) dispatch(leftPanelCollapsed());
    else dispatch(leftPanelExpanded());
  };

  if (!container) return null;

  return createPortal(
    <StyledLeftPanel theme={theme} isOpen={isOpen}>
      <LeftPanelTitle title={title} onClick={handleClick} isOpen={isOpen} />
      {isOpen && <SidePanelContent>{children}</SidePanelContent>}
    </StyledLeftPanel>,
    container
  );
};

export default SettingsPanel;
