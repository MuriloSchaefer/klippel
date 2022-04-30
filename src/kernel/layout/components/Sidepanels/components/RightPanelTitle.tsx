import React, { useContext } from "react";
import styled from "styled-components";
import { ThemeContext, Theme } from "@kernel/contexts/ThemeContext";

const StyledRightPanelTitle = styled("div")<{ theme: Theme }>`
  position: sticky;
  top: 0;
  height: 60px;
  align-items: center;
  display: inline-flex;
  justify-content: center;
  width: 100%;
  border-bottom: solid 1px
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};
`;

export interface RightPanelTitleProps {
  title: string;
}
const RightPanelTitle = ({ title }: RightPanelTitleProps) => {
  const { theme } = useContext(ThemeContext);

  return <StyledRightPanelTitle theme={theme}>{title}</StyledRightPanelTitle>;
};

export default RightPanelTitle;
