import React, { MouseEvent, useContext } from "react";
import styled from "styled-components";
import { ThemeContext, Theme } from "@kernel/modules/LayoutManager/contexts/ThemeContext";

const StyledLeftPanelTitle = styled("div")<{ theme: Theme; isOpen: boolean }>`
  position: sticky;
  top: 0;
  height: 60px;
  align-items: center;
  display: inline-flex;
  justify-content: center;
  width: 100%;
  border-bottom: solid ${(props) => (props.isOpen ? "1px" : "0px")},
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};

  &::after {
    position: absolute;
    right: -15px;
    z-index: 998;
    top: 1em;
    content: "${(props) => (props.isOpen ? "<" : ">")}";
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 30px;
    height: 30px;
    border-radius: 50%;
    border: 1px solid #ddd;
    background-color: ${(props) =>
      props.theme === Theme.Dark ? "#333" : "#eee"};
  }

  &:hover {
    &::after {
      background-color: ${(props) =>
        props.theme === Theme.Dark ? "#eee" : "#333"};
      color: ${(props) => (props.theme === Theme.Dark ? "#333" : "#eee")};
    }
  }
`;

export interface LeftPanelTitleProps {
  title: string;
  isOpen: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}
const LeftPanelTitle = ({ title, isOpen, onClick }: LeftPanelTitleProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <StyledLeftPanelTitle
      theme={theme}
      isOpen={isOpen}
      onClick={(event: MouseEvent<HTMLDivElement>) =>
        onClick ? onClick(event) : null
      }
    >
      {isOpen && title}
    </StyledLeftPanelTitle>
  );
};
LeftPanelTitle.defaultProps = {
  onClick: undefined,
};

export default LeftPanelTitle;
