import React from "react";
import { Tabs, TabSection } from "@kernel/layout/RibbonMenu";
import MannequinSection from "./MannequinSection/MannequinSection";

const initialTabs: Tabs = {
  composer: {
    name: "composer",
    label: "Compositor",
    sections: [
      <MannequinSection />,
      <TabSection
        name="Produtos"
        dropdownContent={
          <div style={{ width: "300px", height: "400px" }}>more products</div>
        }
      >
        <div style={{ width: "200px" }}> </div>
      </TabSection>,
      <TabSection
        name="Modelos"
        dropdownContent={
          <div style={{ width: "300px", height: "400px" }}>more models</div>
        }
      >
        <div style={{ width: "200px" }}> </div>
      </TabSection>,
      <TabSection
        name="Composição"
        dropdownContent={
          <div style={{ width: "300px", height: "400px" }}>
            more compositions
          </div>
        }
      >
        <div style={{ width: "200px" }}> </div>
      </TabSection>,
    ],
  },
};

export default initialTabs;
