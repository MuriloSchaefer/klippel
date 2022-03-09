import styled from "styled-components";

interface TabProps {
  active?: boolean;
  href: string;
}

/**
 * A Tab component render the tab header in the ribbon menu
 * it must have a href link to its content id.
 */
// eslint-disable-next-line import/prefer-default-export
export const Tab = styled.li<TabProps>`
  list-style: none;
  text-align: center;
  width: 12ch;

  height: 25px;
  cursor: pointer;
  border-radius: 5px 5px 0 0;
  border: 1px solid #aaa;
  border-bottom: none;

  background: ${(p) => (p.active ? "white" : "#ddd")};
  color: ${(p) => (p.active ? "#800747" : "black")};
  :hover {
    color: #800747;
  }
  .fixed {
    background: red;
  }
`;
