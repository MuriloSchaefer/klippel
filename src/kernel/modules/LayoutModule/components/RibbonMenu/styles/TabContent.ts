import styled from "styled-components";

interface TabContentProps {
  $active?: boolean;
  id: string;
}
// eslint-disable-next-line import/prefer-default-export
export const TabContent = styled.li<TabContentProps>`
  list-style: none;
  text-align: center;

  display: ${(p) => (p.$active ? "block" : "none")};
`;
