import styled from "styled-components";

export default styled("div")<{ isLeftPanelOpen: boolean }>`
  display: grid;
  grid-template-columns: ${(props) =>
    `${props.isLeftPanelOpen ? "0.75fr" : "10px"} 1.5fr 0.75fr;`} 
  height: calc(100vh - 161px); // full height - ribbon menu
  grid-template-rows: auto;
  grid-template-areas: "leftPanel content rightPanel";

  transition: 2s;
`;
