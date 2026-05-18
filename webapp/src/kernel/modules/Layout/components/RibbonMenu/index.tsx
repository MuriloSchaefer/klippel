import React, { createElement, useCallback, useMemo, useEffect, useRef } from "react";
import { shallowEqual } from "react-redux";

import type { BoxProps } from "@mui/material/Box";
import Box from '@mui/material/Box';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import { TabPanel, TabContext } from "@mui/lab";
import Chip from '@mui/material/Chip';
import KeyboardIcon from '@mui/icons-material/Keyboard';
import type { SxProps, Theme } from "@mui/material/styles";

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

/**
 * Hints overlay — only mounted when `showHints` is true. Subscribes to the
 * subset of `pressedKeys` that matters for the visible Alt+N shortcuts with
 * `shallowEqual`, so pressing unrelated keys is a no-op for this subtree (and
 * the parent RibbonMenu is not subscribed to pressedKeys at all).
 */
interface RibbonHintsOverlayProps {
  tabNames: string[];
  tabRefs: React.MutableRefObject<Record<string, HTMLElement | null>>;
  keyboardHintContainerSx: SxProps<Theme>;
  keyboardHintKeySx: SxProps<Theme>;
  keyboardHintKeyPressedSx: SxProps<Theme>;
  keyboardHintSeparatorSx: SxProps<Theme>;
}

const RibbonHintsOverlay: React.FC<RibbonHintsOverlayProps> = ({
  tabNames,
  tabRefs,
  keyboardHintContainerSx,
  keyboardHintKeySx,
  keyboardHintKeyPressedSx,
  keyboardHintSeparatorSx,
}) => {
  const storeModule = useModule<Store>("Store");
  const { useAppSelector } = storeModule.hooks;

  // One boolean per relevant key part: [altPressed, '1' pressed, '2' pressed, ...].
  // shallowEqual prevents re-renders when other keys toggle.
  const relevantParts = useMemo(
    () => ['Alt', ...tabNames.map((_, i) => String(i + 1))],
    [tabNames],
  );
  const pressedState = useAppSelector(
    (state) => {
      const pressed = selectPressedKeys(state);
      return relevantParts.map((part) => pressed.includes(part));
    },
    shallowEqual,
  );
  const altPressed = pressedState[0];

  return (
    <>
      {tabNames.map((name, index) => {
        const tabEl = tabRefs.current[name];
        if (!tabEl) return null;
        const numberPressed = pressedState[index + 1];
        const isPressed = altPressed || numberPressed;
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
              left: `${tabEl.offsetLeft + 4}px`,
              top: `${tabEl.offsetTop + tabEl.offsetHeight - 26}px`,
            }}
          >
            <KeyboardIcon
              sx={{
                fontSize: '14px',
                color: isPressed ? 'secondary.main' : 'rgba(255, 255, 255, 0.5)',
                transition: 'color 0.1s ease-in-out',
              }}
            />
            <Chip
              label="Alt"
              size="small"
              sx={altPressed ? keyboardHintKeyPressedSx : keyboardHintKeySx}
            />
            <Box component="span" sx={keyboardHintSeparatorSx}>+</Box>
            <Chip
              label={String(index + 1)}
              size="small"
              sx={numberPressed ? keyboardHintKeyPressedSx : keyboardHintKeySx}
            />
          </Box>
        );
      })}
    </>
  );
};

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
          {showHints && (
            <RibbonHintsOverlay
              tabNames={Object.keys(tabs)}
              tabRefs={tabRefs}
              keyboardHintContainerSx={keyboardHintContainerSx}
              keyboardHintKeySx={keyboardHintKeySx}
              keyboardHintKeyPressedSx={keyboardHintKeyPressedSx}
              keyboardHintSeparatorSx={keyboardHintSeparatorSx}
            />
          )}
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
