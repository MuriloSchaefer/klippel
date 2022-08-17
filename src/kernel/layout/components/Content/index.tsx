import styled from "styled-components";

export default styled("div")<{
  isLeftPanelOpen: boolean;
  isRightPanelOpen: boolean;
}>`
  display: grid;
  grid-template-columns: ${(props) =>
    `${props.isLeftPanelOpen ? "0.75fr" : "10px"} 1.5fr ${
      props.isRightPanelOpen ? "0.75fr" : "0px"
    };`} 
  height: calc(100vh - 161px); // full height - ribbon menu
  grid-template-rows: auto;
  grid-template-areas: "leftPanel content rightPanel";

  transition: 2s;
`;
