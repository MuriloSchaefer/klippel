import React from "react";
import {
  FixedSideBar,
  TabSection,
} from "@kernel/modules/LayoutManager/components/RibbonMenu";

export default () => (
  <TabSection
    name="Produtos"
    dropdownContent={
      <div style={{ width: "300px", height: "400px", zIndex: 3 }}>
        more products
      </div>
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
      <button type="button">Camiseta Feminina</button>
      <button type="button">Camiseta Masculina</button>
    </div>
    <FixedSideBar>
      <button type="button">+</button>
      <button type="button">-</button>
    </FixedSideBar>
  </TabSection>
);
