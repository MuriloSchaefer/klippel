import React, { useContext } from "react";
import styled from "styled-components";
import { ThemeContext } from "@kernel/modules/LayoutModule/contexts/ThemeContext";

const StyledSidePanelContent = styled.div``;

export interface SidePanelContentProps {
  children: React.ReactNode;
}
const SidePanelContent = ({ children }: SidePanelContentProps) => {
  const { theme } = useContext(ThemeContext);
  return (
    <StyledSidePanelContent theme={theme}>{children}</StyledSidePanelContent>
  );
};

export default SidePanelContent;
