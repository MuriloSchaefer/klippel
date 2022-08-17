import React from "react";
import styled from "styled-components";
import { Theme, useTheme } from "@kernel/contexts/ThemeContext";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { leftPanelCollapsed, leftPanelExpanded } from "@kernel/layout/ations";
import SidePanelContent from "./SidePanelContent";
import LeftPanelTitle from "./LeftPanelTitle";
import useLeftPanel from "../hooks/useLeftPanel";

const StyledLeftPanel = styled("div")<{ theme: Theme; isOpen: boolean }>`
  grid-area: leftPanel;
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};

  border-right: solid 1px
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};
  position: sticky;
  left: 0;
`;

const LeftPanel = () => {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const isOpen = useAppSelector((state) => state.kernelUI.leftPanel.isOpen);

  const { leftPanel } = useLeftPanel();

  const handleClick = () => {
    // expandable logic for left panel
    if (isOpen) dispatch(leftPanelCollapsed());
    else dispatch(leftPanelExpanded());
  };

  return (
    <StyledLeftPanel theme={theme} isOpen={isOpen}>
      <LeftPanelTitle
        title={leftPanel.title}
        onClick={handleClick}
        isOpen={isOpen}
      />
      {isOpen && <SidePanelContent>{leftPanel.content}</SidePanelContent>}
    </StyledLeftPanel>
  );
};

export default LeftPanel;
