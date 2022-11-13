import React from "react";
import styled from "styled-components";

interface TabProps {
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
  onClose: (e: React.MouseEvent) => void;
  children: React.ReactNode;
}
interface StyledTabProps {
  $active?: boolean;
}

/**
 * A Tab component render the tab header in the ribbon menu
 * it must have a href link to its content id.
 */
// eslint-disable-next-line import/prefer-default-export
export const StyledViewportTab = styled.li<StyledTabProps>`
  list-style: none;
  text-align: center;
  position: relative;
  width: max-content;
  padding: 0 30px 0 10px;

  height: 25px;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  border: 1px solid #aaa;
  border-bottom: none;

  background: ${(p) => (p.$active ? "white" : "#ddd")};
  color: ${(p) => (p.$active ? "#800747" : "black")};
  :hover {
    color: #800747;
  }
  .fixed {
    background: red;
  }
`;

const CloseTabButton = styled.button`
  position: absolute;
  right: 5px;
  border: none;
  background: none;
`;

export const ViewportTab = ({
  active,
  onClick,
  onClose,
  children,
}: TabProps) => (
  <StyledViewportTab $active={active} onClick={onClick}>
    <CloseTabButton onClick={onClose}>x</CloseTabButton>
    {children}
  </StyledViewportTab>
);

const StyledAddViewportTab = styled.li<StyledTabProps>`
  list-style: none;
  text-align: center;
  width: min-content;
  padding: 0 1ch 0 1ch;

  height: 25px;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  border: 1px solid #aaa;
  border-bottom: none;

  background: ${(p) => (p.$active ? "white" : "#ddd")};
  color: ${(p) => (p.$active ? "#800747" : "black")};
  :hover {
    color: #800747;
  }
  .fixed {
    background: red;
  }
`;

export const AddViewportTab = ({ onClick }: { onClick: () => void }) => (
  <StyledAddViewportTab $active={true} onClick={onClick}>
    +
  </StyledAddViewportTab>
);

export const TabsHeader = styled.ul`
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  gap: 2px;
  overflow-x: auto;

  background: #eee;
  margin: 0;
  padding: 2px 0px 0px 4px;
`;

const ViewportTabs = styled.nav`
  position: -webkit-sticky; /* Safari */
  position: sticky;
  flex: 1;
  top: 0;
`;
export default ViewportTabs;
