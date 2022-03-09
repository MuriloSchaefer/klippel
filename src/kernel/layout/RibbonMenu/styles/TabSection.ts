import styled from "styled-components";

export const SectionName = styled.div`
  height: 20px;
  background-color: #eee;
`;

export const SectionContent = styled.div`
  height: 70px;
  background-color: pink;
`;

export const StyledSection = styled.div`
  width: fit-content;
  background-color: gray;

  border: 1px solid #aaa;
  max-height: 90px;
  display: flex;
  flex-direction: column;
`;

export const DropdownSectionContent = styled.div<{ open: boolean }>`
  display: ${(p) => (p.open ? "block" : "none")};
`;

export const DropdownSectionIcon = styled.div<{ open: boolean }>`
  border: solid black;
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 2px;
  transform: ${(p) => (p.open ? "rotate(-135deg)" : "rotate(45deg)")};
`;
