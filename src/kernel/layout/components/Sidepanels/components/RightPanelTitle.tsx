import React, { MouseEvent, useContext } from "react";
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
  border-bottom: solid ${(props) => (props.isOpen ? "1px" : "0px")},
    ${(props) => (props.theme === Theme.Dark ? "#eee" : "#333")};

  &::before {
    position: absolute;
    left: -15px;
    top: 1em;
    content: "x";
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
    &::before {
      background-color: ${(props) =>
        props.theme === Theme.Dark ? "#eee" : "#333"};
      color: ${(props) => (props.theme === Theme.Dark ? "#333" : "#eee")};
    }
  }
`;

export interface RightPanelTitleProps {
  title: string;
  isOpen: boolean;
  onClick?: (event: MouseEvent<HTMLDivElement>) => void;
}
const RightPanelTitle = ({ title, isOpen, onClick }: RightPanelTitleProps) => {
  const { theme } = useContext(ThemeContext);

  return (
    <StyledRightPanelTitle
      theme={theme}
      isOpen={isOpen}
      onClick={(event: MouseEvent<HTMLDivElement>) =>
        onClick ? onClick(event) : null
      }
    >
      {title}
    </StyledRightPanelTitle>
  );
};
RightPanelTitle.defaultProps = {
  onClick: undefined,
};

export default RightPanelTitle;
