import AccountTreeSharpIcon from "@mui/icons-material/AccountTreeSharp";
import ShortTextSharpIcon from "@mui/icons-material/ShortTextSharp";
import ListSharpIcon from "@mui/icons-material/ListSharp";
import SellSharpIcon from "@mui/icons-material/SellSharp";
import AccessTimeSharpIcon from "@mui/icons-material/AccessTimeSharp";

import useModule from "@kernel/hooks/useModule";
import { ILayoutModule } from "@kernel/modules/Layout";
import React from "react";

import MaterialsList from './MaterialsList'
import ProcessesList from './ProcessesList'

const ComposerDetailsPanel = () => {
  const layoutModule = useModule<ILayoutModule>("Layout");

  const { DetailsPanel, Accordion } = layoutModule.components;

  return (
    <DetailsPanel>
      <Accordion
        name="Materiais"
        icon={<ListSharpIcon />}
        summary="Lista de materiais"
      >
        <MaterialsList />
      </Accordion>
      <Accordion
        name="Processos"
        icon={<ListSharpIcon />}
        summary="Lista de processos"
      >
        <ProcessesList />
      </Accordion>
    </DetailsPanel>
  );
};

export default React.memo(ComposerDetailsPanel);
