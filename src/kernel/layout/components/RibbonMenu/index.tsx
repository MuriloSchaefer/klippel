import React, { useState } from "react";

import RibbonMenu, {
  TabsHeader,
  TabsContent,
  TabContent,
  DropDownTab,
  Tab,
} from "./styles";

export { default as TabSection } from "./TabSection";
export { default as FixedSideBar } from "./FixedSideBar";

export interface RibbonTab {
  name: string;
  label: string;
  loaded?: boolean;
  sections: Array<React.ReactNode>;
}

export interface Tabs {
  [name: string]: RibbonTab;
}

interface RibbonMenuProps {
  initialTab?: string;
  tabs: Tabs;
}

/**
 * Ribbon Menu
 *
 */
const RibbonMenuComponent = ({
  tabs,
  initialTab = "file",
}: RibbonMenuProps): React.ReactElement => {
  const [activeTab, setActivetab] = useState<string>(initialTab);

  const handleTabchange = (name: string) => {
    setActivetab(name);
  };

  return (
    <RibbonMenu>
      <TabsHeader>
        <DropDownTab key="file-dropdown">Arquivo</DropDownTab>

        {Object.entries(tabs).map(([name, tab]) => (
          <Tab
            key={`${name}-tab`}
            href={`#${name}`}
            active={name === activeTab}
            onClick={() => handleTabchange(name)}
          >
            {tab.label}
          </Tab>
        ))}
      </TabsHeader>
      <TabsContent>
        {Object.entries(tabs).map(([name, tab]) =>
          tab.sections.map((section) => (
            <TabContent
              key={`${name}-section-${(Math.random() + 1)
                .toString(36)
                .substring(7)}`}
              id={`#${name}`}
              active={name === activeTab}
            >
              {section}
            </TabContent>
          ))
        )}
      </TabsContent>
    </RibbonMenu>
  );
};

RibbonMenuComponent.defaultProps = {
  initialTab: "file",
};

export default RibbonMenuComponent;
