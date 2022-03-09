import styled from "styled-components";

export { TabsHeader } from "./TabsHeader";
export { DropDownTab } from "./DropDownTab";
export { Tab } from "./Tab";
export { TabsContent } from "./TabsContent";
export { TabContent } from "./TabContent";
export { StyledSection, SectionName, SectionContent } from "./TabSection";

const RibbonMenu = styled.nav`
  position: -webkit-sticky; /* Safari */
  position: sticky;
  top: 0;
`;
export default RibbonMenu;
