import React from "react";
import styled from "styled-components";
import { Theme, useTheme } from "@kernel/contexts/ThemeContext";
import RightPanelTitle from "./RightPanelTitle";
import SidePanelContent from "./SidePanelContent";
import useRightPanel from "../hooks/useRightPanel";

const StyledRightPanel = styled("div")<{ theme: Theme }>`
  grid-area: rightPanel;
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  right: 0;
`;

const RightPanel = () => {
  const { theme } = useTheme();

  const { rightPanel } = useRightPanel();

  return (
    <StyledRightPanel theme={theme}>
      <RightPanelTitle title={rightPanel.title} />
      <SidePanelContent>{rightPanel.content}</SidePanelContent>
    </StyledRightPanel>
  );
};

export default RightPanel;
