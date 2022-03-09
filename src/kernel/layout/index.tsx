import React, { useMemo, useState } from "react";
import RibbonMenu, { Tabs } from "./RibbonMenu";
import TabSection from "./RibbonMenu/TabSection";
import { Theme, ThemeContext } from "./ThemeContext";

export default (): React.ReactElement => {
  const [theme, setTheme] = useState<Theme>(Theme.Dark);

  const memoizedTheme = useMemo(
    () => ({
      theme,
      setTheme,
    }),
    [theme]
  );

  const tabs: Tabs = {
    composer: {
      name: "composer",
      label: "Compositor",
      sections: [
        <TabSection
          key="1"
          name="Produto"
          dropdownContent={<div style={{ height: "300px", width: "400px" }} />}
        >
          <div style={{ width: "200px", height: "90px" }} />
        </TabSection>,
        <TabSection
          key="2"
          name="Modelo"
          dropdownContent={<div style={{ height: "300px", width: "400px" }} />}
        >
          <div style={{ width: "400px", height: "90px" }} />
        </TabSection>,
        <TabSection
          key="3"
          name="Composição"
          dropdownContent={<div style={{ height: "300px", width: "400px" }} />}
        >
          <div style={{ width: "500px", height: "90px" }} />
        </TabSection>,
        <TabSection key="4" name="Fichas">
          <div style={{ width: "200px", height: "90px" }} />
        </TabSection>,
      ],
    },
    seller: {
      name: "seller",
      label: "Vendas",
      sections: [
        <TabSection key="5" name="Leads">
          <div style={{ width: "300px", height: "90px" }} />
        </TabSection>,
      ],
    },
  };

  return (
    <ThemeContext.Provider value={memoizedTheme}>
      <RibbonMenu tabs={tabs} initialTab="composer" />
      <div style={{ height: "1500px", width: "100%" }} />
    </ThemeContext.Provider>
  );
};
