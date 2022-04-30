import styled from "styled-components";

// eslint-disable-next-line import/prefer-default-export
export const DropDownTab = styled.li`
  list-style: none;
  text-align: center;
  width: 12ch;

  margin-left: -1px;
  padding-top: 4px;
  height: 25px;
  cursor: pointer;
  border-radius: 10px 10px 0 0;
  color: white;
  background: #800747;

  :hover {
    background: #9f0859;
  }
  .fixed {
    background: red;
  }
`;
