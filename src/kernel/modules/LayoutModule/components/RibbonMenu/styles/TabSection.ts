import styled from "styled-components";

export const SectionName = styled.div<{ $hasdropdown: boolean }>`
  height: 20px;
  width: 100%;
  background-color: #eee;
  cursor: ${(p) => (p.$hasdropdown ? "pointer" : "default")};
`;

export const SectionContent = styled.div`
  height: 90px;
  width: 100%;
  position: relative; // to allow absolute positioning of inner elements
  background-color: #eee;
  display: flex;
  flex-direction: row;
`;

export const StyledSection = styled.section<{ width?: string }>`
  width: ${(p) => p?.width ?? "100%"};
  height: 100%;
  border: 1px solid #aaa;
  display: flex;
  flex-direction: column;
  align-items: center;
`;

export const DropdownSectionContent = styled.div<{ open: boolean }>`
  :before {
    height: 2px;
    width: 80%;
    background-color: red;
  }

  background-color: #777;
  border: 1px solid #aaa;
  border-top: none;

  position: absolute;
  margin: auto;
  margin-top: 110px;
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
