import React from "react";

import {
  FixedSideBar,
  TabSection,
} from "@kernel/modules/LayoutModule/components/RibbonMenu";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/LayoutModule";

import ComposerViewport from "../../Viewport";

export default () => {
  const layoutModule = useModule<ILayoutModule>("LayoutModule");
  const viewportManager = layoutModule.hooks.module.useViewportManager();

  /**
   * Add a new Model to the Composer
   */
  const handleAdd = () => {
    // dispatch()
  };

  const handleModelSelection = () => {
    viewportManager.hooks.addViewport(
      "New Tab",
      "ComposerViewport",
      <ComposerViewport
        innerRef={null}
        product="camisa-polo"
        model="processed"
      />
    );
  };

  return (
    <TabSection
      name="Modelos"
      dropdownContent={
        <div style={{ width: "300px", height: "400px" }}>more models</div>
      }
    >
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "10px",
          justifyContent: "space-evenly",
          alignItems: "center",
        }}
      >
        <button type="button" onClick={handleModelSelection}>
          Camiseta lisa
        </button>
        <button type="button">Camiseta gola v</button>
      </div>
      <FixedSideBar>
        <button type="button" onClick={handleAdd}>
          +
        </button>
        <button type="button">-</button>
      </FixedSideBar>
    </TabSection>
  );
};
