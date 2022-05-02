import React, { useState } from "react";
import styled from "styled-components";
import { Theme, useTheme } from "@kernel/contexts/ThemeContext";
import { useAppDispatch } from "@kernel/store/hooks";
import { leftPanelCollapsed, leftPanelExpanded } from "@kernel/layout/ations";
import SidePanelContent from "./SidePanelContent";
import LeftPanelTitle from "./LeftPanelTitle";
import useLeftPanel from "../hooks/useLeftPanel";

const StyledLeftPanel = styled("div")<{ theme: Theme }>`
  grid-area: leftPanel;
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  left: 0;
`;

const LeftPanel = () => {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(true);

  const { leftPanel } = useLeftPanel();

  const handleClick = () => {
    // expandable logic for left panel
    if (expanded) dispatch(leftPanelCollapsed());
    else dispatch(leftPanelExpanded());
    setExpanded(!expanded);
  };

  return (
    <StyledLeftPanel theme={theme}>
      <LeftPanelTitle title={leftPanel.title} onClick={handleClick} />
      <SidePanelContent>{leftPanel.content}</SidePanelContent>
    </StyledLeftPanel>
  );
};

export default LeftPanel;
