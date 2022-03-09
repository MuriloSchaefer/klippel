import styled from "styled-components";

export const SectionName = styled.div<{ hasDropdown: boolean }>`
  height: 20px;
  background-color: #eee;
  cursor: ${(p) => (p.hasDropdown ? "pointer" : "default")};
`;

export const SectionContent = styled.div`
  height: 90px;
  background-color: #eee;
`;

export const StyledSection = styled.section`
  width: fit-content;

  position: static;
  border: 1px solid #aaa;
  display: flex;
  flex-direction: column;
  max-height: 130px;
`;

export const DropdownSectionContent = styled.div<{ open: boolean }>`
  background-color: #000;
  border: 1px solid #aaa;
  border-top: none;

  position: absolute;
  margin: auto;
  margin-top: 110px;
  z-index: 1;
  margin-right: auto;
  display: ${(p) => (p.open ? "inline-block" : "none")};
`;

export const DropdownSectionIcon = styled.div<{ open: boolean }>`
  border: solid black;
  border-width: 0 2px 2px 0;
  display: inline-block;
  padding: 2px;
  transform: ${(p) => (p.open ? "rotate(-135deg)" : "rotate(45deg)")};
`;
