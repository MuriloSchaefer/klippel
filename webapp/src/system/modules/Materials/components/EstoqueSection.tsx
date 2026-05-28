import React from "react";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { ILayoutModule } from "@kernel/modules/Layout";
import AddMaterialSection from "./AddMaterialSection";
import MaterialStockSection from "./MaterialStockSection";
import ImportCatalogSection from "./ImportCatalogSection";
import { MODULE_NAME } from "../constants";

/**
 * Ribbon section: "Estoque". Groups the Add-material trigger and the
 * Open-stock-viewport trigger under a single titled block.
 *
 * The wrapping `ShortcutProvider` scopes the `q` / `w` / `a`
 * shortcuts to this section so they only fire while the Materiais
 * ribbon tab is active and the focus stack has pushed
 * `Materials/Estoque`.
 */
const EstoqueSection: React.FC = () => {
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ShortcutProvider } = keyboardShortcutsModule.components;
  const { RibbonSection } = layoutModule.components;

  return (
    <ShortcutProvider contextId={`${MODULE_NAME}/Estoque`}>
      <RibbonSection name="Estoque">
        <AddMaterialSection />
        <MaterialStockSection />
        <ImportCatalogSection />
      </RibbonSection>
    </ShortcutProvider>
  );
};

export default EstoqueSection;
