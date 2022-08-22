import React from "react";
import styled from "styled-components";
import { Theme, useTheme } from "@kernel/contexts/ThemeContext";
import { useAppDispatch, useAppSelector } from "@kernel/store/hooks";
import { rightPanelClosed } from "@kernel/layout/ations";
import RightPanelTitle from "./RightPanelTitle";
import SidePanelContent from "./SidePanelContent";
import useRightPanel from "../hooks/useRightPanel";

const StyledRightPanel = styled("div")<{ theme: Theme; isOpen: boolean }>`
  grid-area: rightPanel;
  background-color: ${(props) =>
    props.theme === Theme.Dark ? "#333" : "#eee"};

  border-left: solid 1px
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};
  color: ${(props) => (props.theme === Theme.Dark ? "#ddd" : "#333")};
  position: sticky;
  display: ${(props) => (props.isOpen ? "block" : "none")};
  right: 0;
`;

const RightPanel = () => {
  const dispatch = useAppDispatch();
  const { theme } = useTheme();
  const { isOpen, title } = useAppSelector(
    (state) => state.kernelUI.rightPanel
  );

  const { rightPanel } = useRightPanel();

  const handleClick = () => {
    // expandable logic for left panel
    if (isOpen) dispatch(rightPanelClosed());
  };

  return (
    <StyledRightPanel theme={theme} isOpen={isOpen}>
      <RightPanelTitle title={title} onClick={handleClick} isOpen={isOpen} />
      <SidePanelContent>{rightPanel}</SidePanelContent>
    </StyledRightPanel>
  );
};

export default RightPanel;
