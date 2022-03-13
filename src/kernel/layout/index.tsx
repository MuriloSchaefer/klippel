import ModulesContext from "@kernel/modules/context";
import React, { useContext, useEffect, useMemo, useState } from "react";
import Viewport from "@kernel/viewport";
import RibbonMenu, { Tabs } from "./RibbonMenu";
import { Theme, ThemeContext } from "./ThemeContext";

interface LayoutProps {
  children: React.ReactElement<typeof Viewport>;
}

export default ({ children }: LayoutProps): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>(Theme.Dark);
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

  // load modules tabs
  useEffect(() => {
    const newTabs: Tabs = {};
    if (!loadModules) return;

    modules.forEach((module) => {
      if (module?.ribbonTabs) {
        console.log(module);
        Object.entries(module.ribbonTabs).forEach(([tabName, tabValues]) => {
          newTabs[tabName] = newTabs[tabName]
            ? newTabs[tabName]
            : { ...tabValues, sections: [] };
          newTabs[tabName].sections.push(...tabValues.sections);
        });
      }
    });
    setTabs(newTabs);
    setLoadModules(false);
  }, []);

  return (
    <ThemeContext.Provider value={memoizedTheme}>
      <RibbonMenu tabs={tabs} initialTab="composer" />
      {children}
    </ThemeContext.Provider>
  );
};
