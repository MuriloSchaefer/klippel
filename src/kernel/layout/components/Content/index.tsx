import styled from "styled-components";

export default styled("div")<{
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
}>`
  display: flex;
  flex-direction: row;
  justify-content: space-between;
  height: calc(100vh - 161px); // full height - ribbon menu
`;
