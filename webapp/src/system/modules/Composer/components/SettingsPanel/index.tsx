import React from "react";

import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import ShortTextSharpIcon from "@mui/icons-material/ShortTextSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";


import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";

import CompositionTree from "./CompositionTree";
import MaterialList from "./MaterialList";

const ComposerSettingsPanel = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { SettingsPanel, Accordion } = layoutModule.components;

  return (
    <SettingsPanel>
      <Accordion
        name="Composição"
        icon={<AccountTreeSharpIcon />}
        summary="composição da peça"
      >

        <CompositionTree />
      </Accordion>

      <Accordion
        name="Materiais"
        icon={<ShortTextSharpIcon />}
        summary="Lista de materiais necessários"
      >
        <MaterialList />
      </Accordion>
      <Accordion
        name="Prazos"
        icon={<AccessTimeSharpIcon />}
        summary="tempo de produção"
      >
        <></>
      </Accordion>
      <Accordion
        name="Valores"
        icon={<SellSharpIcon />}
        summary="Preço da peça"
      >
        <></>
      </Accordion>
    </SettingsPanel>
  );
};

export default React.memo(ComposerSettingsPanel);
