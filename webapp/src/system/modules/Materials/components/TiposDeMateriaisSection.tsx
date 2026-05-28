import React from "react";
import { Box, Divider } from "@mui/material";
import useModule from "@kernel/hooks/useModule";
import type { IKeyboardShortcutsModule } from "@kernel/modules/KeyboardShortcuts";
import type { ILayoutModule } from "@kernel/modules/Layout";
import MaterialTypesSection from "./MaterialTypesSection";
import UpdateMaterialTypeSection from "./UpdateMaterialTypeSection";
import { MODULE_NAME } from "../constants";

/**
 * Ribbon section: "Tipos de materiais". Groups the new-type and
 * edit-type triggers. Sits to the right of the `Estoque` section in
 * the "Materiais" tab — a `Divider` separates the two visually.
 *
 * `ShortcutProvider` scopes the `e` / `r` shortcuts to this section
 * so they only fire while the Materiais ribbon tab is active.
 */
const TiposDeMateriaisSection: React.FC = () => {
  const keyboardShortcutsModule =
    useModule<IKeyboardShortcutsModule>("KeyboardShortcuts");
  const layoutModule = useModule<ILayoutModule>("Layout");
  const { ShortcutProvider } = keyboardShortcutsModule.components;
  const { RibbonSection } = layoutModule.components;

  return (
    <ShortcutProvider contextId={`${MODULE_NAME}/TiposDeMateriais`}>
      <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
        <Divider orientation="vertical" flexItem />
        <RibbonSection name="Tipos de materiais">
          <MaterialTypesSection />
          <UpdateMaterialTypeSection />
        </RibbonSection>
      </Box>
    </ShortcutProvider>
  );
};

export default TiposDeMateriaisSection;
