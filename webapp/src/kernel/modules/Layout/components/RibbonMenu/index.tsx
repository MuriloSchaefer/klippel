import React, { useContext, useMemo } from "react";
import { Tabs, Tab, Box } from "@mui/material";
import { TabPanel, TabContext } from "@mui/lab";

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";

import { selectActiveTab, selectTabs } from "../../store/selectors";
import SectionsProvider, { SectionsContext } from "./SectionsProvider";

const RibbonMenu = ({systemTray}: {systemTray?: React.ReactNode}) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  const tabs = useAppSelector(selectTabs);
  const activeTab = useAppSelector(selectActiveTab);

  const { sections } = useContext(SectionsContext);

  if (!activeTab || !tabs) return <></>;

  return (
    <TabContext value={activeTab}>
      <Box sx={{ display: "flex", justifyContent: 'space-between'  }}>
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
              wrapped
            />
          ))}
        </Tabs>
        <Box role="system-tray" aria-label="system tray" sx={{display: "flex", p:1, alignItems: "center"}}>
          {systemTray}
        </Box>
      </Box>

      <Box
        role="ribbon-menu-panels"
        aria-label="ribbon menu panels"
        sx={{
          borderBottom: 1,
          borderColor: "divider",
          minHeight: "15vh",
        }}
      >
        {sections &&
          Object.entries(sections).map(([name, panel_sections]) => (
            <TabPanel value={name} key={`ribbon-panel-${name}`}>
              {panel_sections}
            </TabPanel>
          ))}
      </Box>
    </TabContext>
  );
};

export const RibbonMenuProvider = ({children}: {children?: React.ReactNode}) => {

  const default_sections = useMemo(()=>({ file: [<div key="test">test</div>] }), [])
  return (
    <SectionsProvider default_sections={default_sections}>
      <RibbonMenu systemTray={children}/>
    </SectionsProvider>
  );
};
export default React.memo(RibbonMenuProvider);