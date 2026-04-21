import React, { createElement, useCallback, useMemo, useEffect, useRef } from "react";

import type { BoxProps } from "@mui/material/Box";
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { TabPanel, TabContext } from "@mui/lab";
import Chip from '@mui/material/Chip';
import KeyboardIcon from '@mui/icons-material/Keyboard';

import useModule from "@kernel/hooks/useModule";
import { Store } from "@kernel/modules/Store";
import type { KeyboardShortcuts } from "@kernel/modules/KeyboardShortcuts";
import { selectShowHints, selectPressedKeys } from "@kernel/modules/KeyboardShortcuts/store/selectors";

import { selectActiveTab, selectTabs } from "../../store/ribbonMenu/selectors";
import SectionsProvider from "./SectionsProvider";
import useRibbonMenuManager from "../../hooks/useRibbonMenuManager";
import { MODULE_NAME, SECTIONS_REGISTRY_NAME } from "../../constants";

interface RibbonMenuProps extends BoxProps {
  systemTray?: React.ReactNode;
}

const RibbonMenu = ({ systemTray }: RibbonMenuProps) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;
  const { componentRegistry } = storeModule.managers;

  const keyboardShortcutsModule = useModule<KeyboardShortcuts>("KeyboardShortcuts");
  const { 
    keyboardHintContainerSx,
    keyboardHintKeySx,
    keyboardHintKeyPressedSx,
    keyboardHintSeparatorSx,
  } = keyboardShortcutsModule.styles;
  const {ShortcutProvider} = keyboardShortcutsModule.components

  const componentRegistryManager = componentRegistry();

  const ribbonMenuManager = useRibbonMenuManager();
  const { selectTab } = ribbonMenuManager.functions;

  const tabs = useAppSelector(selectTabs);
  const activeTab = useAppSelector(selectActiveTab);
  const showHints = useAppSelector(selectShowHints);
  const pressedKeys = useAppSelector(selectPressedKeys);
  
  // Refs to track tab elements for hint positioning
  const tabRefs = useRef<Record<string, HTMLElement | null>>({});

  const handleTabSelection = useCallback((name: string) => {
    selectTab(name);
    //setSections(name, [<div>testing</div>])
  }, [selectTab]);

  if (!activeTab || !tabs) return <></>;

  return (
    <TabContext value={activeTab}>
      <Box
        sx={{ display: "flex", justifyContent: "space-between"}}
        aria-label="ribbon menu tabs"
      >
        <Box sx={{ position: 'relative', flex: 1 }}>
          <ShortcutProvider contextId={`${MODULE_NAME}/RibbonMenu`} >
          <Tabs
            value={activeTab}
            aria-label="ribbon menu tabs"
            id="ribbon-menu-tabs"
            textColor="secondary"
            indicatorColor="secondary"
          >
            {Object.entries(tabs).map(([name, tab], index) => (
              <Tab
                value={name}
                key={name}
                label={tab.label}
                id={`${MODULE_NAME}/RibbonMenu/${index}`}
                onClick={() => handleTabSelection(name)}
                wrapped
                ref={(el) => {
                  tabRefs.current[name] = el;
                }}
                sx={{ position: 'relative' }}
              />
            ))}
          </Tabs>
          {/* Render keyboard hints as overlays */}
          {showHints && Object.entries(tabs).map(([name, tab], index) => {
            const shortcutKey = `Alt+${index + 1}`;
            const keyParts = shortcutKey.split('+');
            const isPressed = keyParts.some(part => pressedKeys.includes(part));
            const tabEl = tabRefs.current[name];
            
            if (!tabEl) return null;
            
            return (
              <Box
                key={`hint-${name}`}
                sx={{
                  position: 'absolute',
                  ...keyboardHintContainerSx,
                  pointerEvents: 'none',
                  zIndex: 10,
                }}
                style={{
                  left: `${tabEl.offsetLeft + tabEl.offsetWidth - 60}px`,
                  top: `${tabEl.offsetTop + tabEl.offsetHeight - 15}px`,
                }}
              >
                <KeyboardIcon
                  sx={{
                    fontSize: '10px',
                    color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.4)',
                    transition: 'color 0.1s ease-in-out',
                  }}
                />
                {keyParts.map((part, i) => (
                  <React.Fragment key={i}>
                    {i > 0 && (
                      <Box component="span" sx={keyboardHintSeparatorSx}>
                        +
                      </Box>
                    )}
                    <Chip
                      label={part}
                      size="small"
                      sx={
                        pressedKeys.includes(part)
                          ? keyboardHintKeyPressedSx
                          : keyboardHintKeySx
                      }
                    />
                  </React.Fragment>
                ))}
              </Box>
            );
          })}
          </ShortcutProvider>
        </Box>
        <Box
          id="system-tray"
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
  
  return (
    <SectionsProvider default_sections={default_sections}>
      <RibbonMenu {...props} systemTray={children}/>
    </SectionsProvider>
  );
};
export default React.memo(RibbonMenuProvider);
