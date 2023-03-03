import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import ShortTextSharpIcon from "@mui/icons-material/ShortTextSharp";
import ListSharpIcon from "@mui/icons-material/ListSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import AccessTimeSharpIcon from '@mui/icons-material/AccessTimeSharp';

import CompositionTree from "./CompositionTree";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import React from "react";

const ComposerSettingsPanel = ({graphId}: {graphId: string}) => {
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
        name="Sumário"
        icon={<ShortTextSharpIcon />}
        summary="Resumo da peça"
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
      <Accordion
        name="Prazos"
        icon={<AccessTimeSharpIcon />}
        summary="tempo de produção"
      >
        <></>
      </Accordion>
    </SettingsPanel>
  );
};

export default React.memo(ComposerSettingsPanel);
