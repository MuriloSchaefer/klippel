import React, { MouseEvent, useState } from "react";
import styled from "styled-components";
import { Theme, useTheme } from "@kernel/contexts/ThemeContext";
import SidePanelContent from "./SidePanelContent";
import LeftPanelTitle from "./LeftPanelTitle";
import { useLeftPanel } from "../contexts/LeftPanelContext";

const StyledLeftPanel = styled("div")<{ theme: Theme }>`
  grid-area: leftPanel;
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  left: 0;
`;

const LeftPanel = () => {
  const { theme } = useTheme();
  const [expanded, setExpanded] = useState(true);

  const { leftPanel } = useLeftPanel();

  const handleClick = (event: MouseEvent) => {
    // expandable logic for left panel
    console.log(event);
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
