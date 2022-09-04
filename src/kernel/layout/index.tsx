import React, { useContext, useEffect, useMemo, useState } from "react";

import ModulesContext from "@kernel/modules/context";

import ViewportContentContext, {
  ViewportContentMap,
} from "@kernel/contexts/viewports";
import { Theme, ThemeContext } from "../contexts/ThemeContext";
import RibbonMenu, { Tabs } from "./components/RibbonMenu";

import ViewportManager from "./components/ViewportManager";
import Content from "./components/Content";

export default (): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>(Theme.Light);
  const [tabs, setTabs] = useState<Tabs>({});
  const [viewports, setViewports] = useState<ViewportContentMap>({});
  const [loadModules, setLoadModules] = useState(true);

  const { modules } = useContext(ModulesContext);

  const memoizedTheme = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme]
  );

  const memoizedViewports = useMemo(
    () => ({
      viewports,
      setViewports,
    }),
    [viewports]
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
      <ViewportContentContext.Provider value={memoizedViewports}>
        <RibbonMenu tabs={tabs} initialTab="composer" />
        <Content>
          <div id="settingsPanel" />
          <ViewportManager />
          <div id="detailsPanel" />
        </Content>
      </ViewportContentContext.Provider>
    </ThemeContext.Provider>
  );
};
