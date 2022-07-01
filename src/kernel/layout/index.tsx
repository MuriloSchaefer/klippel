import React, { useContext, useEffect, useMemo, useState } from "react";

import ModulesContext from "@kernel/modules/context";

import { useAppSelector } from "@kernel/store/hooks";
import { Theme, ThemeContext } from "../contexts/ThemeContext";
import RibbonMenu, { Tabs } from "./components/RibbonMenu";
import Viewport from "./components/Viewport";
import Content from "./components/Content";

import LeftPanel from "./components/Sidepanels/components/LeftPanel";
import RightPanel from "./components/Sidepanels/components/RightPanel";
import { LeftPanelContext } from "./components/Sidepanels/contexts/LeftPanelContext";
import { RightPanelContext } from "./components/Sidepanels/contexts/RightPanelContext";

interface LayoutProps {
  children: React.ReactElement<typeof Viewport>;
}

export default ({ children }: LayoutProps): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>(Theme.Light);
  const [tabs, setTabs] = useState<Tabs>({});
  const [loadModules, setLoadModules] = useState(true);

  const { modules } = useContext(ModulesContext);

  const memoizedTheme = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme]
  );

  const isLeftPanelOpen = useAppSelector(
    (state) => state.kernelUIState.leftPanel.isOpen
  );

  const [leftPanel, setLeftPanel] = useState<{
    title: string;
    content: React.ReactNode;
  }>({
    title: "Left Panel Title",
    content: <div>left panel content</div>,
  });
  const memoizedLeftPanel = useMemo(
    () => ({
      leftPanel,
      setLeftPanel,
    }),
    [leftPanel]
  );

  const [rightPanel, setRightPanel] = useState<{
    title: string;
    content: React.ReactNode;
  }>({
    title: "Right Panel Title",
    content: <div>right panel content</div>,
  });
  const memoizedRightPanel = useMemo(
    () => ({
      rightPanel,
      setRightPanel,
    }),
    [rightPanel]
  );

  // load modules tabs
  useEffect(() => {
    const newTabs: Tabs = {};
    if (!loadModules) return;

    Object.values(modules).forEach((module) => {
      if (module?.components.ribbonTabs) {
        // If modules has some ribbonTabs, add the tab if it does not exists or extend it if it does exist
        Object.entries(module.components.ribbonTabs).forEach(
          ([tabName, tabValues]) => {
            newTabs[tabName] = newTabs[tabName]
              ? newTabs[tabName]
              : { ...tabValues, sections: [] };
            newTabs[tabName].sections.push(...tabValues.sections);
          }
        );
      }
    });
    setTabs(newTabs);
    setLoadModules(false);
  }, []);

  return (
    <ThemeContext.Provider value={memoizedTheme}>
      <RibbonMenu tabs={tabs} initialTab="composer" />
      <LeftPanelContext.Provider value={memoizedLeftPanel}>
        <RightPanelContext.Provider value={memoizedRightPanel}>
          <Content isLeftPanelOpen={isLeftPanelOpen}>
            <LeftPanel />
            <div style={{ gridArea: "content", padding: "15px" }}>
              {children}
            </div>
            <RightPanel />
          </Content>
        </RightPanelContext.Provider>
      </LeftPanelContext.Provider>
    </ThemeContext.Provider>
  );
};
