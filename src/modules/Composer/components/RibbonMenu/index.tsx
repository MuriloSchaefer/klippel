import React from "react";
import { Tabs } from "@kernel/modules/LayoutModule/components/RibbonMenu";
import ProductsSection from "./ProductsSection";
import ModelsSection from "./ModelsSection";

const initialTabs: Tabs = {
  composer: {
    name: "composer",
    label: "Compositor",
    sections: [<ProductsSection />, <ModelsSection />],
  },
};

export default initialTabs;
