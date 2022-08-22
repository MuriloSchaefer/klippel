import styled from "styled-components";

// eslint-disable-next-line import/prefer-default-export
export const TabsContent = styled.ul`
  display: flex;
  position: relative;
  flex-direction: row;
  flex-wrap: nowrap;
  align-items: center;
  padding-left: 5px;
  gap: 5px;
  overflow-x: auto;

  background-color: #ddd;
  border: 1px solid #aaa;
  margin: 0;
  height: 130px;
  box-shadow: 10px;
`;
