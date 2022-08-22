import styled from "styled-components";

export const FixedSideBar = styled.div`
  right: 0;
  position: sticky;
  border-left: 1px solid #aaa;
  display: flex;
  flex-direction: column;
  justify-content: space-evenly;
  align-items: center;
  width: 3rem;
  height: 100%;
`;

export default FixedSideBar;
