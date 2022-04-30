import React from "react";
import styled from "styled-components";
import { Theme, ThemeContext } from "@kernel/contexts/ThemeContext";
import RightPanelTitle from "./RightPanelTitle";
import SidePanelContent from "./SidePanelContent";

const StyledRightPanel = styled("div")<{ theme: Theme }>`
  grid-area: rightPanel;
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  right: 0;
`;

export interface RightPanelProps {
  title: string;
  children: React.ReactNode;
}
const RightPanel = ({ title, children }: RightPanelProps) => {
  const { theme } = React.useContext(ThemeContext);
  return (
    <StyledRightPanel title={title} theme={theme}>
      <RightPanelTitle title={title} />
      <SidePanelContent>{children}</SidePanelContent>
    </StyledRightPanel>
  );
};

export default RightPanel;
