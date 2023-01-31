import React, { createElement, useCallback, useContext, useMemo } from "react";
import { Tabs, Tab, Box, BoxProps } from "@mui/material";
import { TabPanel, TabContext } from "@mui/lab";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectActiveTab, selectTabs } from "../../store/ribbonMenu/selectors";
import SectionsProvider, { SectionsContext } from "./SectionsProvider";
import useRibbonMenuManager from "../../hooks/useRibbonMenuManager";
import { SECTIONS_REGISTRY_NAME } from "../../constants";

interface RibbonMenuProps extends BoxProps {
  systemTray?: React.ReactNode;
}

const RibbonMenu = ({ systemTray }: RibbonMenuProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { componentRegistry } = storeModule.managers;

  const componentRegistryManager = componentRegistry();

  const ribbonMenuManager = useRibbonMenuManager();
  const { selectTab } = ribbonMenuManager.functions;

  const tabs = useAppSelector(selectTabs);
  const activeTab = useAppSelector(selectActiveTab);

  const handleTabSelection = useCallback((name: string) => {
    selectTab(name);
    //setSections(name, [<div>testing</div>])
  }, []);

  if (!activeTab || !tabs) return <></>;

  return (
    <TabContext value={activeTab}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between"}}
        role="ribbon-menu-tabs"
        aria-label="ribbon menu tabs"
      >
        <Tabs
          value={activeTab}
          aria-label="ribbon menu tabs"
          role="ribbon-menu-tabs"
          textColor="secondary"
          indicatorColor="secondary"
        >
          {Object.entries(tabs).map(([name, tab]) => (
            <Tab
              value={name}
              key={name}
              label={tab.label}
              id={name}
              onClick={() => handleTabSelection(name)}
              wrapped
            />
          ))}
        </Tabs>
        <Box
          role="system-tray"
          aria-label="system tray"
          sx={{ display: "flex", p: 1, alignItems: "center" }}
        >
          {systemTray}
        </Box>
      </Box>

      <Box
        role="ribbon-menu-panels"
        aria-label="ribbon menu panels"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          minHeight: "10vh"
        }}
      >
        {tabs &&
          Object.entries(tabs).map(([name, tab]) => (
            <TabPanel value={name} key={`ribbon-panel-${name}`}>
              {tab.sectionNames &&
                tab.sectionNames.map((sectionName) => {
                  const comp = componentRegistryManager.functions.getComponent(
                    SECTIONS_REGISTRY_NAME,
                    sectionName
                  );
                  return createElement(
                    comp,
                    { key: `ribbon-panel-${name}-section-${sectionName}` },
                    []
                  );
                })}
            </TabPanel>
          ))}
      </Box>
    </TabContext>
  );
};

export const RibbonMenuProvider = ({children, ...props}: RibbonMenuProps) => {
  const default_sections = useMemo(
    () => ({ file: [<div key="test">test</div>] }),
    []
  );
  console.log(children)
  return (
    <SectionsProvider default_sections={default_sections}>
      <RibbonMenu {...props} systemTray={children}/>
    </SectionsProvider>
  );
};
export default React.memo(RibbonMenuProvider);
