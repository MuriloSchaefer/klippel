import { Tabs } from "@kernel/layout/RibbonMenu";

import { IModule } from "@kernel/modules/base";
import useSVG from "./hooks/useSVG";

const tabs: Tabs = {
  test: {
    name: "test",
    label: "test",
    sections: [],
  },
};

/**
 * SVG module handles any operation on SVG
 * such as loading, parsing, and serializing
 */
const SVGModule: IModule = {
  ribbonTabs: tabs,
  hooks: [useSVG],
};

export default SVGModule;
