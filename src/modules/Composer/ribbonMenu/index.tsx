import React from "react";
import { Tabs, TabSection } from "@kernel/layout/RibbonMenu";

const initialTabs: Tabs = {
  composer: {
    name: "composer",
    label: "Compositor",
    sections: [
      <TabSection
        name="Modelos"
        dropdownContent={
          <div style={{ width: "300px", height: "400px" }}>test</div>
        }
      >
        <div style={{ width: "200px" }}> </div>
      </TabSection>,
    ],
  },
};

export default initialTabs;
