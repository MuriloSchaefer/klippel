import styled from "styled-components";
import { Viewport } from "./Viewport";

export const FullScreenViewport = styled(Viewport)`
  width: 500px;
  height: 500px;
`;

const StyledLayout = styled.div`
  background-color: black;
  width: 700px;
  height: 500px;
`;

export default StyledLayout;
